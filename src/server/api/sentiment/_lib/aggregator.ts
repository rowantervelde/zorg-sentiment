/**
 * Sentiment Aggregator (T021, T021b)
 * Orchestrates data fetching, analysis, and storage from all sources
 */

import PQueue from 'p-queue';
import type { RawPost, AnalyzedPost, DataSourceStatus } from '~/types/sentiment';
import { TwitterAdapter } from './sources/twitter';
import { RedditAdapter } from './sources/reddit';
import { MastodonAdapter } from './sources/mastodon';
import { RSSAdapter } from './sources/rss';
import { TweakersAdapter } from './sources/tweakers';
import type { IDataSource } from './sources/base';
import { SentimentAnalyzer } from './sentiment/analyzer';
import { BucketManager } from './storage/buckets';
import { logger } from './logger';

const aggregatorLogger = logger.child('aggregator');

interface AggregatorConfig {
  twitterBearerToken?: string;
  redditClientId?: string;
  redditClientSecret?: string;
  redditUserAgent?: string;
  mastodonInstanceUrl?: string;
  mastodonAccessToken?: string;
  rssNumlUrl?: string;
  tweakersForumUrl?: string;
}

export class SentimentAggregator {
  private sources: IDataSource[];
  private analyzer: SentimentAnalyzer;
  private storage: BucketManager;
  private queue: PQueue;
  private lastSourceStatus: Map<string, DataSourceStatus> = new Map();

  constructor(config?: AggregatorConfig) {
    // Initialize sources with runtime config
    this.sources = [
      new TwitterAdapter(config?.twitterBearerToken),
      new RedditAdapter(config?.redditClientId, config?.redditClientSecret, config?.redditUserAgent),
      new MastodonAdapter(config?.mastodonInstanceUrl, config?.mastodonAccessToken),
      new RSSAdapter(config?.rssNumlUrl),
      new TweakersAdapter(config?.tweakersForumUrl),
    ];

    this.analyzer = new SentimentAnalyzer();
    this.storage = new BucketManager();
    
    // Queue for parallel source fetching with concurrency limit
    this.queue = new PQueue({ concurrency: 5 });

    aggregatorLogger.info('Aggregator initialized', {
      source_count: this.sources.length,
    });
  }

  /**
   * Fetch and aggregate sentiment from all sources (FR-001, FR-002)
   */
  async aggregate(): Promise<{ 
    posts: AnalyzedPost[]; 
    sources: DataSourceStatus[];
    backfilled: boolean;
  }> {
    const sinceTimestamp = this.calculateSinceTimestamp();
    const allPosts: RawPost[] = [];
    const sourceStatuses: DataSourceStatus[] = [];
    let backfilled = false;

    aggregatorLogger.info('Starting aggregation', { since: sinceTimestamp });

    // Fetch from all sources in parallel (FR-006 graceful degradation)
    const results = await Promise.allSettled(
      this.sources.map(source =>
        this.queue.add(async () => {
          try {
            // Check for source recovery and backfill if needed (T021b - FR-022)
            const shouldBackfill = await this.checkForRecovery(source);
            
            let posts: RawPost[];
            if (shouldBackfill) {
              aggregatorLogger.info('Source recovered, backfilling 24 hours', {
                source: source.sourceId,
              });
              const backfillSince = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
              posts = await source.fetchPosts(backfillSince, 500);
              backfilled = true;
            } else {
              posts = await source.fetchPosts(sinceTimestamp, 100);
            }

            const status = await source.getStatus();
            sourceStatuses.push(status);
            
            // Update last known status for recovery detection
            this.lastSourceStatus.set(source.sourceId, status);

            return posts;
          } catch (error) {
            aggregatorLogger.error('Source fetch failed', {
              source: source.sourceId,
              error: error instanceof Error ? error.message : String(error),
            });
            
            const status = await source.getStatus();
            sourceStatuses.push(status);
            this.lastSourceStatus.set(source.sourceId, status);
            
            return [];
          }
        })
      )
    );

    // Collect all successful posts
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allPosts.push(...result.value);
      }
    }

    aggregatorLogger.info('Fetch complete', {
      total_posts: allPosts.length,
      sources_available: sourceStatuses.filter(s => s.status === 'available').length,
      backfilled,
    });

    // Analyze posts with sentiment and language filtering (FR-002, FR-008)
    const analyzedPosts = await this.analyzer.analyzeBatch(
      allPosts,
      (text) => this.extractTopics(text)
    );

    // Store in buckets (FR-011)
    if (analyzedPosts.length > 0) {
      await this.storage.addPosts(analyzedPosts);
    }

    // Clean old buckets
    await this.storage.cleanOldBuckets();

    return {
      posts: analyzedPosts,
      sources: sourceStatuses,
      backfilled,
    };
  }

  /**
   * Check if source has recovered from unavailable state (T021b - FR-022)
   */
  private async checkForRecovery(source: IDataSource): Promise<boolean> {
    const lastStatus = this.lastSourceStatus.get(source.sourceId);
    
    if (!lastStatus) {
      return false; // First run, no recovery needed
    }

    if (lastStatus.status === 'unavailable') {
      // Check if source is now available
      const isHealthy = await source.healthCheck();
      
      if (isHealthy) {
        aggregatorLogger.info('Source recovery detected', {
          source: source.sourceId,
          last_success: lastStatus.last_success,
        });
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate timestamp for fetching recent data (last hour)
   * Extended to 24 hours for testing if SENTIMENT_LOOKBACK_HOURS is set
   */
  private calculateSinceTimestamp(): string {
    const lookbackHours = Number(process.env.SENTIMENT_LOOKBACK_HOURS || '1');
    const lookbackMs = lookbackHours * 60 * 60 * 1000;
    const sinceTime = new Date(Date.now() - lookbackMs);
    return sinceTime.toISOString();
  }

  /**
   * Extract healthcare topics from text (simplified for now)
   */
  private extractTopics(text: string): string[] {
    const topics: string[] = [];
    const lowerText = text.toLowerCase();

    // Simple keyword-based topic extraction
    const topicKeywords: Record<string, string[]> = {
      'waiting_times': ['wachttijd', 'wachtlijst', 'wachten'],
      'mental_health': ['ggz', 'mentale gezondheid', 'depressie', 'angst'],
      'hospitals': ['ziekenhuis', 'ic', 'spoedeisende hulp', 'seh'],
      'gp_care': ['huisarts', 'dokter', 'praktijk'],
      'insurance': ['zorgverzekering', 'verzekering', 'premie', 'eigen risico'],
      'staff_shortage': ['personeelstekort', 'tekort', 'werkdruk'],
    };

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        topics.push(topic);
      }
    }

    return topics;
  }

  /**
   * Get recent buckets for snapshot calculation
   */
  async getRecentBuckets() {
    return await this.storage.getRecentBuckets();
  }
}
