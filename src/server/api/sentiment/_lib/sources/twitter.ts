/**
 * Twitter/X Data Source Adapter (T016)
 * Fetches recent tweets about Dutch healthcare (FR-017)
 */

import pRetry from 'p-retry';
import type { RawPost, DataSourceStatus } from '~/types/sentiment';
import { BaseDataSource } from './base';
import { rateLimiterFactory } from '../rate-limiter';
import { logger } from '../logger';

const twitterLogger = logger.child('twitter-adapter');

interface RateLimitError extends Error {
  skipRetry?: boolean;
}

export class TwitterAdapter extends BaseDataSource {
  readonly sourceId: DataSourceStatus['source_id'] = 'twitter';
  private bearerToken: string;
  private limiter = rateLimiterFactory.getTwitterLimiter();

  constructor(bearerToken?: string) {
    super();
    // Accept token from parameter (for runtime config) or fall back to process.env
    this.bearerToken = bearerToken || process.env.TWITTER_BEARER_TOKEN || '';
    
    if (!this.bearerToken) {
      twitterLogger.warn('Twitter bearer token not configured');
    }
  }

  async fetchPosts(sinceTimestamp: string, maxPosts: number = 100): Promise<RawPost[]> {
    if (!this.bearerToken) {
      this.markError('Twitter API credentials not configured');
      return [];
    }

    try {
      const posts = await this.limiter.schedule(() => 
        this.fetchWithRetry(sinceTimestamp, maxPosts)
      );
      
      this.markSuccess();
      return posts;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.markError(message);
      twitterLogger.error('Failed to fetch Twitter posts', { error: message });
      return [];
    }
  }

  private async fetchWithRetry(sinceTimestamp: string, maxPosts: number): Promise<RawPost[]> {
    return pRetry(
      async () => {
        const query = encodeURIComponent('zorg OR gezondheidszorg OR #zorg lang:nl');
        const startTime = new Date(sinceTimestamp).toISOString();
        
        const url = `https://api.twitter.com/2/tweets/search/recent?query=${query}&max_results=${Math.min(maxPosts, 100)}&start_time=${startTime}&tweet.fields=created_at,author_id`;

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.bearerToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 429) {
            // Don't retry on rate limit - just fail fast
            const error = new Error('Rate limit exceeded') as RateLimitError;
            error.skipRetry = true;
            throw error;
          }
          throw new Error(`Twitter API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as { data?: Array<{ id: string; text: string; created_at: string; author_id?: string }> };
        
        if (!data.data) {
          return [];
        }

        return data.data.map(tweet => ({
          id: `twitter_${tweet.id}`,
          source: 'twitter' as const,
          text: tweet.text,
          author: tweet.author_id,
          created_at: tweet.created_at,
          url: `https://twitter.com/i/web/status/${tweet.id}`,
        }));
      },
      {
        retries: 3,
        shouldRetry: (context) => {
          // Don't retry if it's a rate limit error
          const rateLimitError = context.error as RateLimitError;
          return !rateLimitError.skipRetry;
        },
        onFailedAttempt: (context) => {
          // Check if this is a rate limit error that shouldn't be retried
          const rateLimitError = context.error as RateLimitError;
          if (!rateLimitError.skipRetry) {
            twitterLogger.warn('Twitter fetch retry', {
              attempt: context.attemptNumber,
              retriesLeft: context.retriesLeft,
            });
          }
        },
      }
    );
  }

  async healthCheck(): Promise<boolean> {
    if (!this.bearerToken) {
      return false;
    }

    try {
      // Simple API test - get user rate limit status
      const response = await fetch('https://api.twitter.com/2/tweets/search/recent?query=test&max_results=10', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
        },
      });

      return response.ok || response.status === 429; // 429 means API is working but rate limited
    } catch (error) {
      twitterLogger.error('Twitter health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}
