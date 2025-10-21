/**
 * Mastodon Data Source Adapter (T018)
 * Fetches recent posts from Dutch Mastodon instance (FR-019)
 */

import pRetry from 'p-retry';
import type { RawPost, DataSourceStatus } from '~/types/sentiment';
import { BaseDataSource } from './base';
import { rateLimiterFactory } from '../rate-limiter';
import { logger } from '../logger';

const mastodonLogger = logger.child('mastodon-adapter');

export class MastodonAdapter extends BaseDataSource {
  readonly sourceId: DataSourceStatus['source_id'] = 'mastodon';
  private instanceUrl: string;
  private accessToken: string;
  private limiter = rateLimiterFactory.getMastodonLimiter();

  constructor(instanceUrl?: string, accessToken?: string) {
    super();
    // Accept credentials from parameters (for runtime config) or fall back to process.env
    this.instanceUrl = instanceUrl || process.env.MASTODON_INSTANCE_URL || 'https://mastodon.nl';
    this.accessToken = accessToken || process.env.MASTODON_ACCESS_TOKEN || '';
    
    if (!this.accessToken) {
      mastodonLogger.warn('Mastodon access token not configured');
    }
  }

  async fetchPosts(sinceTimestamp: string, maxPosts: number = 100): Promise<RawPost[]> {
    if (!this.accessToken) {
      this.markError('Mastodon API credentials not configured');
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
      mastodonLogger.error('Failed to fetch Mastodon posts', { error: message });
      return [];
    }
  }

  private async fetchWithRetry(sinceTimestamp: string, maxPosts: number): Promise<RawPost[]> {
    return pRetry(
      async () => {
        // Comprehensive Dutch healthcare search
        const query = encodeURIComponent(
          'zorg OR gezondheidszorg OR ziekenhuis OR huisarts OR verzekering OR wachttijd OR GGZ OR ' +
          'patiënt OR verpleging OR ouderenzorg OR medicijn OR apotheek OR thuiszorg OR dokter OR ' +
          'arts OR "mentale gezondheid" OR behandeling'
        );
        const sinceId = this.timestampToId(sinceTimestamp);
        
        const url = `${this.instanceUrl}/api/v2/search?q=${query}&type=statuses&limit=${Math.min(maxPosts, 40)}&since_id=${sinceId}`;

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          if (response.status === 429) {
            throw new Error('Rate limit exceeded');
          }
          throw new Error(`Mastodon API error: ${response.status}`);
        }

        const data = await response.json() as {
          statuses: Array<{
            id: string;
            content: string;
            created_at: string;
            account: { id: string; username: string };
            url: string;
          }>;
        };

        return data.statuses.map(status => ({
          id: `mastodon_${status.id}`,
          source: 'mastodon' as const,
          text: this.stripHtml(status.content),
          author: status.account.username,
          created_at: status.created_at,
          url: status.url,
        }));
      },
      {
        retries: 3,
        onFailedAttempt: (error) => {
          mastodonLogger.warn('Mastodon fetch retry', {
            attempt: error.attemptNumber,
            retriesLeft: error.retriesLeft,
          });
        },
      }
    );
  }

  private stripHtml(html: string): string {
    // Simple HTML tag removal
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private timestampToId(timestamp: string): string {
    // Mastodon snowflake IDs are roughly chronological
    // For simplicity, use a rough approximation
    const ms = new Date(timestamp).getTime();
    return String(ms * 1000); // Convert to microseconds
  }

  async healthCheck(): Promise<boolean> {
    if (!this.accessToken) {
      return false;
    }

    try {
      const response = await fetch(`${this.instanceUrl}/api/v1/instance`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      return response.ok;
    } catch (error) {
      mastodonLogger.error('Mastodon health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}
