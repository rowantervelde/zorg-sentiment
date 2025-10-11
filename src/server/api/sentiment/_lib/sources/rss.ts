/**
 * RSS Feed Data Source Adapter (T019)
 * Fetches healthcare news from Nu.nl RSS feed (FR-020)
 */

import pRetry from 'p-retry';
import type { RawPost, DataSourceStatus } from '~/types/sentiment';
import { BaseDataSource } from './base';
import { rateLimiterFactory } from '../rate-limiter';
import { logger } from '../logger';

const rssLogger = logger.child('rss-adapter');

export class RSSAdapter extends BaseDataSource {
  readonly sourceId: DataSourceStatus['source_id'] = 'rss_numl';
  private feedUrl: string;
  private limiter = rateLimiterFactory.getRSSLimiter();

  constructor() {
    super();
    this.feedUrl = process.env.RSS_NUML_URL || 'https://www.nu.nl/rss/Algemeen';
  }

  async fetchPosts(sinceTimestamp: string, maxPosts: number = 100): Promise<RawPost[]> {
    try {
      const posts = await this.limiter.schedule(() => 
        this.fetchWithRetry(sinceTimestamp, maxPosts)
      );
      
      this.markSuccess();
      return posts;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.markError(message);
      rssLogger.error('Failed to fetch RSS posts', { error: message });
      return [];
    }
  }

  private async fetchWithRetry(sinceTimestamp: string, maxPosts: number): Promise<RawPost[]> {
    return pRetry(
      async () => {
        const response = await fetch(this.feedUrl);

        if (!response.ok) {
          throw new Error(`RSS fetch error: ${response.status}`);
        }

        const xmlText = await response.text();
        return this.parseRSS(xmlText, sinceTimestamp, maxPosts);
      },
      {
        retries: 3,
        onFailedAttempt: (error) => {
          rssLogger.warn('RSS fetch retry', {
            attempt: error.attemptNumber,
            retriesLeft: error.retriesLeft,
          });
        },
      }
    );
  }

  private parseRSS(xmlText: string, sinceTimestamp: string, maxPosts: number): RawPost[] {
    const posts: RawPost[] = [];
    const sinceDate = new Date(sinceTimestamp);

    // Simple XML parsing for RSS items
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xmlText)) !== null && posts.length < maxPosts) {
      const itemXml = match[1];
      
      const title = this.extractTag(itemXml, 'title');
      const description = this.extractTag(itemXml, 'description');
      const link = this.extractTag(itemXml, 'link');
      const pubDate = this.extractTag(itemXml, 'pubDate');

      if (!title || !pubDate) continue;

      const createdAt = new Date(pubDate);
      if (createdAt < sinceDate) continue;

      // Filter for healthcare-related content
      const text = `${title} ${description}`.toLowerCase();
      if (!this.isHealthcareRelated(text)) continue;

      posts.push({
        id: `rss_${Buffer.from(link || title).toString('base64').slice(0, 16)}`,
        source: 'rss_numl',
        text: `${title}. ${description}`.trim(),
        created_at: createdAt.toISOString(),
        url: link,
      });
    }

    return posts;
  }

  private extractTag(xml: string, tag: string): string {
    const regex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([\\s\\S]*?)</${tag}>`);
    const match = regex.exec(xml);
    return match ? (match[1] || match[2] || '').trim() : '';
  }

  private isHealthcareRelated(text: string): boolean {
    const keywords = ['zorg', 'gezondheid', 'ziekenhuis', 'dokter', 'arts', 'patiënt', 'behandel', 'medisch'];
    return keywords.some(keyword => text.includes(keyword));
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(this.feedUrl, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      rssLogger.error('RSS health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}
