/**
 * Main Sentiment API Endpoint (T022)
 * GET /api/sentiment - Returns current sentiment snapshot
 */

import { defineEventHandler, setResponseHeaders, setResponseStatus } from 'h3';
import type { H3Event } from 'h3';
import { promises as fs } from 'fs';
import { join } from 'path';
import { SentimentAggregator } from './_lib/aggregator';
import { SpikeDetector } from './_lib/spike-detector';
import { HistoricalContextCalculator } from './_lib/storage/context';
import { sentimentCache } from './_lib/storage/cache';
import type { SentimentSnapshot, AnalyzedPost, DataSourceStatus } from '~/types/sentiment';
import { logger } from './_lib/logger';

const apiLogger = logger.child('api');

/**
 * Custom error for insufficient data (T038 - FR-010, FR-011)
 */
class InsufficientDataError extends Error {
  constructor(
    message: string,
    public attemptedSources: number,
    public sourcesAvailable: DataSourceStatus[],
    public sourcesUnavailable: DataSourceStatus[]
  ) {
    super(message);
    this.name = 'InsufficientDataError';
  }
}

// Singleton instances
let aggregator: SentimentAggregator | null = null;
let spikeDetector: SpikeDetector | null = null;
let contextCalculator: HistoricalContextCalculator | null = null;

function getAggregator(): SentimentAggregator {
  if (!aggregator) {
    // Access runtime config via process.env in Nuxt server context
    // (Nuxt automatically loads these from runtimeConfig into process.env)
    aggregator = new SentimentAggregator({
      twitterBearerToken: process.env.TWITTER_BEARER_TOKEN,
      redditClientId: process.env.REDDIT_CLIENT_ID,
      redditClientSecret: process.env.REDDIT_CLIENT_SECRET,
      redditUserAgent: process.env.REDDIT_USER_AGENT,
      mastodonInstanceUrl: process.env.MASTODON_INSTANCE_URL,
      mastodonAccessToken: process.env.MASTODON_ACCESS_TOKEN,
      rssNumlUrl: process.env.RSS_NUML_URL,
      tweakersForumUrl: process.env.TWEAKERS_FORUM_URL,
    });
  }
  return aggregator;
}

function getSpikeDetector(): SpikeDetector {
  if (!spikeDetector) {
    spikeDetector = new SpikeDetector();
  }
  return spikeDetector;
}

function getContextCalculator(): HistoricalContextCalculator {
  if (!contextCalculator) {
    contextCalculator = new HistoricalContextCalculator();
  }
  return contextCalculator;
}

export default defineEventHandler(async (event: H3Event) => {
  const startTime = Date.now();

  try {
    // Check cache first (FR-009 - 15 minute cache)
    const cached = sentimentCache.get();
    if (cached) {
      apiLogger.info('Cache hit', {
        age_minutes: Math.round((Date.now() - new Date(cached.last_updated).getTime()) / 60000),
        response_time_ms: Date.now() - startTime,
      });

      // Set cache headers
      setResponseHeaders(event, {
        'Cache-Control': 'public, max-age=900', // 15 minutes
        'Content-Type': 'application/json',
      });

      return cached;
    }

    apiLogger.info('Cache miss, generating snapshot');

    // Generate new snapshot
    const snapshot = await generateSnapshot();

    // Cache the result
    sentimentCache.set(snapshot);

    // Set response headers
    setResponseHeaders(event, {
      'Cache-Control': 'public, max-age=900', // 15 minutes
      'Content-Type': 'application/json',
    });

    apiLogger.info('Snapshot generated successfully', {
      overall_score: snapshot.overall_score,
      sample_size: snapshot.data_quality.sample_size,
      sources_available: snapshot.sources.filter(s => s.status === 'available').length,
      response_time_ms: Date.now() - startTime,
    });

    return snapshot;

  } catch (error) {
    // T039: Handle InsufficientDataError specifically (FR-018)
    if (error instanceof InsufficientDataError) {
      apiLogger.warn('Insufficient data sources available', {
        attempted: error.attemptedSources,
        available: error.sourcesAvailable.length,
        unavailable: error.sourcesUnavailable.length,
        response_time_ms: Date.now() - startTime,
      });

      setResponseStatus(event, 503);
      return {
        error: 'Insufficient data sources',
        message: error.message,
        attempted_sources: error.attemptedSources,
        sources_available: error.sourcesAvailable,
        sources_unavailable: error.sourcesUnavailable,
        retry_after: 300, // 5 minutes
      };
    }

    // Generic error handling
    apiLogger.error('Failed to generate snapshot', {
      error: error instanceof Error ? error.message : String(error),
      response_time_ms: Date.now() - startTime,
    });

    // Return 503 Service Unavailable with error details
    setResponseStatus(event, 503);
    return {
      error: 'Service temporarily unavailable',
      message: 'Unable to generate sentiment snapshot. Please try again later.',
      details: error instanceof Error ? error.message : String(error),
    };
  }
});

/**
 * Generate sentiment snapshot from all sources (FR-001, FR-002)
 */
async function generateSnapshot(): Promise<SentimentSnapshot> {
logger.info('Generating new sentiment snapshot');   
  const agg = getAggregator();
  const detector = getSpikeDetector();

  // Step 1: Fetch and aggregate from all sources
  const { posts, sources } = await agg.aggregate();

  // Step 1b: Check source availability (T038 - FR-010, FR-011)
  const sourcesAvailable = sources.filter(s => s.status === 'available');
  const sourcesUnavailable = sources.filter(s => s.status === 'unavailable');
  
  if (sourcesAvailable.length < 2) {
    throw new InsufficientDataError(
      'At least 2 sources required',
      sources.length,
      sourcesAvailable,
      sourcesUnavailable
    );
  }

  // Step 2: Get recent buckets for analysis
  const buckets = await agg.getRecentBuckets();

  // Ensure we have data
  if (buckets.length === 0 || posts.length === 0) {
    throw new Error('Insufficient data: No posts available');
  }

  // Step 3: Calculate overall score from most recent bucket
  const latestBucket = buckets[buckets.length - 1];
  const overallScore = latestBucket.aggregate_score;

  // Step 4: Calculate trend (FR-003)
  const trend = detector.calculateTrend(buckets);

  // Step 5: Detect spikes (FR-004, FR-005, FR-006) - T029
  const spikeResult = detector.detectSpike(buckets, overallScore);

  // Step 5b: Log spike events to spikes.jsonl (T031)
  if (spikeResult.isSpike && spikeResult.stats) {
    await logSpikeEvent({
      timestamp: new Date().toISOString(),
      current_score: spikeResult.stats.current_score,
      historical_mean: spikeResult.stats.historical_mean,
      std_dev: spikeResult.stats.std_dev,
      deviation: spikeResult.stats.deviation,
      direction: spikeResult.direction!,
      magnitude: spikeResult.stats.deviation / spikeResult.stats.std_dev,
    });
  }

  // Step 6: Calculate data quality (FR-010)
  const totalSampleSize = buckets.reduce((sum, b) => sum + b.post_count, 0);
  const stalenessMinutes = Math.round(
    (Date.now() - new Date(latestBucket.end_time).getTime()) / 60000
  );

  // Calculate language filter rate (% of posts filtered)
  const dutchPosts = posts.filter(p => p.language === 'nl').length;
  const languageFilterRate = posts.length > 0 
    ? ((posts.length - dutchPosts) / posts.length) 
    : 0;

  const dataQuality = {
    sample_size: totalSampleSize,
    confidence: totalSampleSize >= 100 ? 'high' : totalSampleSize >= 50 ? 'medium' : 'low',
    staleness_minutes: stalenessMinutes,
    language_filter_rate: languageFilterRate,
  } as const;

  // Step 7: Extract topic sentiments (FR-005)
  const topicSentiments = calculateTopicSentiments(posts);

  // Step 8: Ensure we have exactly 24 hourly buckets (T026 - FR-004)
  const hourlyBuckets = ensureTwentyFourBuckets(buckets);

  // Step 8b: Calculate 30-day historical context (T033 - FR-007)
  const contextCalc = getContextCalculator();
  const historicalContext = await contextCalc.calculate30DayContext();

  // Step 8c: Calculate data freshness (T035 - FR-009)
  // Use staleness_minutes for age calculation (consistent with data_quality)
  const ageMinutes = stalenessMinutes;
  const isStale = ageMinutes > 30;

  // Step 9: Build snapshot
  const snapshot: SentimentSnapshot = {
    overall_score: overallScore,
    trend,
    spike_detected: spikeResult.isSpike, // T029 - FR-005
    spike_direction: spikeResult.direction, // T029 - FR-006
    min_30day: historicalContext?.min_30day, // T033 - FR-007
    max_30day: historicalContext?.max_30day, // T033 - FR-007
    age_minutes: ageMinutes, // T035 - FR-009
    is_stale: isStale, // T035 - FR-009
    last_updated: new Date().toISOString(),
    data_quality: dataQuality,
    topics: topicSentiments,
    sources,
    hourly_buckets: hourlyBuckets, // T026 - 24-hour trend data
  };

  return snapshot;
}

/**
 * Calculate sentiment by topic (FR-005)
 */
function calculateTopicSentiments(posts: AnalyzedPost[]): SentimentSnapshot['topics'] {
  const topicMap = new Map<string, { scores: number[]; count: number }>();

  // Aggregate scores by topic
  for (const post of posts) {
    for (const topicId of post.topics) {
      if (!topicMap.has(topicId)) {
        topicMap.set(topicId, { scores: [], count: 0 });
      }
      const topic = topicMap.get(topicId)!;
      topic.scores.push(post.sentiment_score);
      topic.count++;
    }
  }

  // Calculate topic sentiments
  const topics: SentimentSnapshot['topics'] = [];
  const topicNames: Record<string, string> = {
    waiting_times: 'Wachttijden',
    mental_health: 'GGZ',
    hospitals: 'Ziekenhuizen',
    gp_care: 'Huisartsenzorg',
    insurance: 'Zorgverzekeringen',
    staff_shortage: 'Personeelstekort',
  };

  for (const [topicId, data] of topicMap) {
    if (data.count < 3) continue; // Skip topics with too few mentions

    const avgScore = data.scores.reduce((sum, s) => sum + s, 0) / data.count;
    
    // Check if polarizing (FR-014): variance > 0.5
    const variance = data.scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / data.count;
    const isPolarizing = variance > 0.5;

    topics.push({
      topic_id: topicId,
      topic_name: topicNames[topicId] || topicId,
      score: avgScore,
      sample_size: data.count,
      is_polarizing: isPolarizing,
    });
  }

  // Sort by sample size (most mentioned first)
  return topics.sort((a, b) => b.sample_size - a.sample_size);
}

/**
 * Ensure exactly 24 hourly buckets (T026 - FR-004)
 * Fills in empty buckets with default values if data is missing
 */
function ensureTwentyFourBuckets(buckets: SentimentSnapshot['hourly_buckets']): SentimentSnapshot['hourly_buckets'] {
  const result: SentimentSnapshot['hourly_buckets'] = [];
  const now = new Date();
  
  // Generate 24 hourly slots from 23 hours ago to current hour
  for (let i = 23; i >= 0; i--) {
    const targetTime = new Date(now.getTime() - (i * 60 * 60 * 1000));
    const targetHour = targetTime.toISOString().slice(0, 13); // YYYY-MM-DDTHH
    
    // Find bucket matching this hour
    const bucket = buckets.find(b => b.start_time.startsWith(targetHour));
    
    if (bucket) {
      result.push(bucket);
    } else {
      // Create empty bucket placeholder
      const startTime = new Date(targetTime);
      startTime.setMinutes(0, 0, 0);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
      
      result.push({
        bucket_id: `${targetHour}-00`,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        post_count: 0,
        aggregate_score: 0,
        posts: [],
      });
    }
  }
  
  return result;
}

/**
 * Log spike event to spikes.jsonl (T031)
 * Append-only format for tracking significant sentiment shifts
 */
interface SpikeEventLog {
  timestamp: string;
  current_score: number;
  historical_mean: number;
  std_dev: number;
  deviation: number;
  direction: 'positive' | 'negative';
  magnitude: number; // deviation / std_dev
}

async function logSpikeEvent(event: SpikeEventLog): Promise<void> {
  try {
    const dataDir = join(process.cwd(), 'src', 'server', 'data', 'sentiment');
    const spikesFile = join(dataDir, 'spikes.jsonl');
    
    // Ensure directory exists
    await fs.mkdir(dataDir, { recursive: true });
    
    // Append event as JSONL (one JSON object per line)
    const line = JSON.stringify(event) + '\n';
    await fs.appendFile(spikesFile, line, 'utf-8');
    
    apiLogger.info('Spike event logged', {
      timestamp: event.timestamp,
      direction: event.direction,
      magnitude: event.magnitude.toFixed(2),
    });
  } catch (error) {
    apiLogger.error('Failed to log spike event', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw - spike logging is non-critical
  }
}
