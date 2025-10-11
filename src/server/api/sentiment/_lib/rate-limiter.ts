/**
 * Rate Limiter Factory (T012-T015)
 * Creates rate limiters for different data sources (FR-023)
 */

import Bottleneck from 'bottleneck';
import type { RateLimitConfig } from '~/types/sentiment';
import { logger } from './logger';

const rateLimitLogger = logger.child('rate-limiter');

export class RateLimiter {
  private limiter: Bottleneck;
  private sourceId: string;

  constructor(sourceId: string, config: RateLimitConfig) {
    this.sourceId = sourceId;

    // Bottleneck configuration
    const minTime = Math.ceil(60000 / config.requests_per_minute); // ms between requests

    this.limiter = new Bottleneck({
      minTime, // Minimum time between requests
      maxConcurrent: 1, // Sequential requests
      reservoir: config.requests_per_hour, // Initial capacity
      reservoirRefreshAmount: config.requests_per_hour, // Refill amount
      reservoirRefreshInterval: 60 * 60 * 1000, // Refill every hour
    });

    rateLimitLogger.info('Rate limiter created', {
      source: sourceId,
      requests_per_minute: config.requests_per_minute,
      requests_per_hour: config.requests_per_hour,
    });
  }

  /**
   * Schedule a function to run with rate limiting
   */
  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await this.limiter.schedule(fn);
    } catch (error) {
      rateLimitLogger.error('Rate limit error', {
        source: this.sourceId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get current rate limiter counts
   */
  counts(): Bottleneck.Counts {
    return this.limiter.counts();
  }

  /**
   * Stop the rate limiter
   */
  async stop(): Promise<void> {
    await this.limiter.stop();
  }
}

/**
 * Rate limiter factory for different sources
 */
export class RateLimiterFactory {
  private limiters = new Map<string, RateLimiter>();

  /**
   * Get or create rate limiter for Twitter (T012)
   */
  getTwitterLimiter(): RateLimiter {
    if (!this.limiters.has('twitter')) {
      const config: RateLimitConfig = {
        requests_per_minute: parseInt(process.env.RATE_LIMIT_TWITTER || '100', 10),
        requests_per_hour: parseInt(process.env.RATE_LIMIT_TWITTER || '100', 10),
      };
      this.limiters.set('twitter', new RateLimiter('twitter', config));
    }
    return this.limiters.get('twitter')!;
  }

  /**
   * Get or create rate limiter for Reddit (T013)
   */
  getRedditLimiter(): RateLimiter {
    if (!this.limiters.has('reddit')) {
      const config: RateLimitConfig = {
        requests_per_minute: parseInt(process.env.RATE_LIMIT_REDDIT || '60', 10),
        requests_per_hour: parseInt(process.env.RATE_LIMIT_REDDIT || '60', 10),
      };
      this.limiters.set('reddit', new RateLimiter('reddit', config));
    }
    return this.limiters.get('reddit')!;
  }

  /**
   * Get or create rate limiter for Mastodon (T014)
   */
  getMastodonLimiter(): RateLimiter {
    if (!this.limiters.has('mastodon')) {
      const config: RateLimitConfig = {
        requests_per_minute: parseInt(process.env.RATE_LIMIT_MASTODON || '300', 10),
        requests_per_hour: parseInt(process.env.RATE_LIMIT_MASTODON || '300', 10),
      };
      this.limiters.set('mastodon', new RateLimiter('mastodon', config));
    }
    return this.limiters.get('mastodon')!;
  }

  /**
   * Get or create rate limiter for RSS feeds (T015)
   */
  getRSSLimiter(): RateLimiter {
    if (!this.limiters.has('rss')) {
      const config: RateLimitConfig = {
        requests_per_minute: parseInt(process.env.RATE_LIMIT_RSS || '60', 10),
        requests_per_hour: parseInt(process.env.RATE_LIMIT_RSS || '60', 10),
      };
      this.limiters.set('rss', new RateLimiter('rss', config));
    }
    return this.limiters.get('rss')!;
  }

  /**
   * Get or create rate limiter for Tweakers (T015)
   */
  getTweakersLimiter(): RateLimiter {
    if (!this.limiters.has('tweakers')) {
      const config: RateLimitConfig = {
        requests_per_minute: parseInt(process.env.RATE_LIMIT_TWEAKERS || '60', 10),
        requests_per_hour: parseInt(process.env.RATE_LIMIT_TWEAKERS || '60', 10),
      };
      this.limiters.set('tweakers', new RateLimiter('tweakers', config));
    }
    return this.limiters.get('tweakers')!;
  }

  /**
   * Stop all rate limiters
   */
  async stopAll(): Promise<void> {
    await Promise.all(
      Array.from(this.limiters.values()).map(limiter => limiter.stop())
    );
    this.limiters.clear();
  }
}

// Export singleton instance
export const rateLimiterFactory = new RateLimiterFactory();
