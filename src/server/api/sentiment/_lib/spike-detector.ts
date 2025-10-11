/**
 * Spike Detector (T011)
 * Detects sentiment spikes using statistical analysis (FR-004)
 */

import { standardDeviation, mean } from 'simple-statistics';
import type { SentimentBucket, SpikeDetectionConfig } from '~/types/sentiment';
import { logger } from './logger';

const spikeLogger = logger.child('spike-detector');

export class SpikeDetector {
  private config: Required<SpikeDetectionConfig>;

  constructor(config?: Partial<SpikeDetectionConfig>) {
    this.config = {
      lookback_hours: config?.lookback_hours ?? 24,
      std_dev_threshold: config?.std_dev_threshold ?? 2.0,
      min_sample_size: config?.min_sample_size ?? 50,
    };

    spikeLogger.info('Spike detector initialized', {
      lookback_hours: this.config.lookback_hours,
      std_dev_threshold: this.config.std_dev_threshold,
    });
  }

  /**
   * Detect if current sentiment represents a spike (FR-004)
   * Uses standard deviation method: spike if |current - mean| > threshold * std_dev
   */
  detectSpike(buckets: SentimentBucket[], currentScore: number): boolean {
    // Need sufficient data
    const totalPosts = buckets.reduce((sum, b) => sum + b.post_count, 0);
    if (totalPosts < this.config.min_sample_size) {
      spikeLogger.debug('Insufficient data for spike detection', {
        sample_size: totalPosts,
        required: this.config.min_sample_size,
      });
      return false;
    }

    // Calculate historical statistics
    const scores = buckets.map(b => b.aggregate_score);
    
    if (scores.length < 2) {
      return false;
    }

    const historicalMean = mean(scores);
    const historicalStdDev = standardDeviation(scores);

    // Detect spike: deviation exceeds threshold
    const deviation = Math.abs(currentScore - historicalMean);
    const isSpike = deviation > (this.config.std_dev_threshold * historicalStdDev);

    if (isSpike) {
      spikeLogger.warn('Sentiment spike detected', {
        current_score: currentScore,
        historical_mean: historicalMean,
        std_dev: historicalStdDev,
        deviation,
        threshold: this.config.std_dev_threshold,
      });
    }

    return isSpike;
  }

  /**
   * Calculate trend from recent buckets (FR-003)
   */
  calculateTrend(buckets: SentimentBucket[]): 'rising' | 'falling' | 'stable' {
    if (buckets.length < 2) {
      return 'stable';
    }

    // Compare recent half vs older half
    const midpoint = Math.floor(buckets.length / 2);
    const olderBuckets = buckets.slice(0, midpoint);
    const recentBuckets = buckets.slice(midpoint);

    const olderMean = mean(olderBuckets.map(b => b.aggregate_score));
    const recentMean = mean(recentBuckets.map(b => b.aggregate_score));

    const difference = recentMean - olderMean;
    const threshold = 0.05; // 5% change threshold

    if (difference > threshold) {
      return 'rising';
    } else if (difference < -threshold) {
      return 'falling';
    } else {
      return 'stable';
    }
  }

  /**
   * Get spike detection statistics
   */
  getStats(): Required<SpikeDetectionConfig> {
    return { ...this.config };
  }
}
