/**
 * Reddit Data Source Adapter (T017)
 * Fetches recent posts from Dutch healthcare subreddits (FR-018)
 */

import pRetry from 'p-retry';
import type { RawPost, DataSourceStatus } from '~/types/sentiment';
import { BaseDataSource } from './base';
import { rateLimiterFactory } from '../rate-limiter';
import { logger } from '../logger';

const redditLogger = logger.child('reddit-adapter');

export class RedditAdapter extends BaseDataSource {
  readonly sourceId: DataSourceStatus['source_id'] = 'reddit';
  private clientId: string;
  private clientSecret: string;
  private userAgent: string;
  private accessToken?: string;
  private tokenExpiry?: number;
  private limiter = rateLimiterFactory.getRedditLimiter();

  constructor(clientId?: string, clientSecret?: string, userAgent?: string) {
    super();
    // Accept credentials from parameters (for runtime config) or fall back to process.env
    this.clientId = clientId || process.env.REDDIT_CLIENT_ID || '';
    this.clientSecret = clientSecret || process.env.REDDIT_CLIENT_SECRET || '';
    this.userAgent = userAgent || process.env.REDDIT_USER_AGENT || 'zorg-sentiment/1.0';
    
    if (!this.clientId || !this.clientSecret) {
      redditLogger.warn('Reddit API credentials not configured');
    }
  }

  async fetchPosts(sinceTimestamp: string, maxPosts: number = 100): Promise<RawPost[]> {
    if (!this.clientId || !this.clientSecret) {
      this.markError('Reddit API credentials not configured');
      return [];
    }

    try {
      await this.ensureAccessToken();
      
      const posts = await this.limiter.schedule(() => 
        this.fetchWithRetry(sinceTimestamp, maxPosts)
      );
      
      this.markSuccess();
      return posts;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.markError(message);
      redditLogger.error('Failed to fetch Reddit posts', { error: message });
      return [];
    }
  }

  private async ensureAccessToken(): Promise<void> {
    const now = Date.now();
    
    if (this.accessToken && this.tokenExpiry && now < this.tokenExpiry) {
      return; // Token still valid
    }

    // Get new access token
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    
    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': this.userAgent,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(`Reddit auth failed: ${response.status}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    this.tokenExpiry = now + (data.expires_in * 1000) - 60000; // Refresh 1 min early

    redditLogger.info('Reddit access token refreshed');
  }

  private async fetchWithRetry(sinceTimestamp: string, maxPosts: number): Promise<RawPost[]> {
    return pRetry(
      async () => {
        // Broader subreddits: Netherlands, health, healthcare, insurance, mental health
        const subreddits = 'thenetherlands+gezondheid+hulpdiensten+verzekeringen+zorgverzekering+GGZ+mentalhealth';
        const url = `https://oauth.reddit.com/r/${subreddits}/new?limit=${Math.min(maxPosts, 100)}`;

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'User-Agent': this.userAgent,
          },
        });

        if (!response.ok) {
          if (response.status === 429) {
            throw new Error('Rate limit exceeded');
          }
          throw new Error(`Reddit API error: ${response.status}`);
        }

        const data = await response.json() as {
          data: {
            children: Array<{
              data: {
                id: string;
                title: string;
                selftext: string;
                author: string;
                created_utc: number;
                permalink: string;
              };
            }>;
          };
        };

        const sinceSec = Math.floor(new Date(sinceTimestamp).getTime() / 1000);

        return data.data.children
          .filter(child => child.data.created_utc >= sinceSec)
          .map(child => ({
            id: `reddit_${child.data.id}`,
            source: 'reddit' as const,
            text: `${child.data.title} ${child.data.selftext}`.trim(),
            author: child.data.author,
            created_at: new Date(child.data.created_utc * 1000).toISOString(),
            url: `https://reddit.com${child.data.permalink}`,
          }));
      },
      {
        retries: 3,
        onFailedAttempt: (error) => {
          redditLogger.warn('Reddit fetch retry', {
            attempt: error.attemptNumber,
            retriesLeft: error.retriesLeft,
          });
        },
      }
    );
  }

  async healthCheck(): Promise<boolean> {
    if (!this.clientId || !this.clientSecret) {
      return false;
    }

    try {
      await this.ensureAccessToken();
      return !!this.accessToken;
    } catch (error) {
      redditLogger.error('Reddit health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}
