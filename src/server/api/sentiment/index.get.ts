/**
 * Main Sentiment API Endpoint (T022)
 * GET /api/sentiment - Returns current sentiment snapshot
 */

import { defineEventHandler, setResponseHeaders, setResponseStatus } from 'h3';
import type { H3Event } from 'h3';
import { SentimentAggregator } from './_lib/aggregator';
import { SpikeDetector } from './_lib/spike-detector';
import { sentimentCache } from './_lib/storage/cache';
import type { SentimentSnapshot, AnalyzedPost } from '~/types/sentiment';
import { logger } from './_lib/logger';

const apiLogger = logger.child('api');

// Singleton instances
let aggregator: SentimentAggregator | null = null;
let spikeDetector: SpikeDetector | null = null;

function getAggregator(): SentimentAggregator {
  if (!aggregator) {
    aggregator = new SentimentAggregator();
  }
  return aggregator;
}

function getSpikeDetector(): SpikeDetector {
  if (!spikeDetector) {
    spikeDetector = new SpikeDetector();
  }
  return spikeDetector;
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

  // Step 5: Detect spikes (FR-004)
  const spikeDetected = detector.detectSpike(buckets, overallScore);

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

  // Step 8: Build snapshot
  const snapshot: SentimentSnapshot = {
    overall_score: overallScore,
    trend,
    spike_detected: spikeDetected,
    last_updated: new Date().toISOString(),
    data_quality: dataQuality,
    topics: topicSentiments,
    sources,
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
