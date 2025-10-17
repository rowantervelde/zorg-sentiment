/**
 * Tweakers Forum Data Source Adapter (T020)
 * Fetches healthcare discussions from Tweakers RSS feed (FR-020)
 */

import pRetry from 'p-retry';
import type { RawPost, DataSourceStatus } from '~/types/sentiment';
import { BaseDataSource } from './base';
import { rateLimiterFactory } from '../rate-limiter';
import { logger } from '../logger';

const tweakersLogger = logger.child('tweakers-adapter');

export class TweakersAdapter extends BaseDataSource {
  readonly sourceId: DataSourceStatus['source_id'] = 'tweakers';
  private feedUrl: string;
  private limiter = rateLimiterFactory.getTweakersLimiter();

  constructor(feedUrl?: string) {
    super();
    // Accept feed URL from parameter (for runtime config) or fall back to process.env
    this.feedUrl = feedUrl || process.env.TWEAKERS_FORUM_URL || 'https://tweakers.net/feeds/mixed.xml';
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
      tweakersLogger.error('Failed to fetch Tweakers posts', { error: message });
      return [];
    }
  }

  private async fetchWithRetry(sinceTimestamp: string, maxPosts: number): Promise<RawPost[]> {
    return pRetry(
      async () => {
        const response = await fetch(this.feedUrl);

        if (!response.ok) {
          throw new Error(`Tweakers fetch error: ${response.status}`);
        }

        const xmlText = await response.text();
        return this.parseRSS(xmlText, sinceTimestamp, maxPosts);
      },
      {
        retries: 3,
        onFailedAttempt: (error) => {
          tweakersLogger.warn('Tweakers fetch retry', {
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

    // Parse RSS items
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xmlText)) !== null && posts.length < maxPosts) {
      const itemXml = match[1];
      
      const title = this.extractTag(itemXml, 'title');
      const description = this.extractTag(itemXml, 'description');
      const link = this.extractTag(itemXml, 'link');
      const pubDate = this.extractTag(itemXml, 'pubDate');
      const author = this.extractTag(itemXml, 'author') || this.extractTag(itemXml, 'dc:creator');

      if (!title || !pubDate) continue;

      const createdAt = new Date(pubDate);
      if (createdAt < sinceDate) continue;

      // Filter for healthcare/tech-healthcare related content
      const text = `${title} ${description}`.toLowerCase();
      if (!this.isHealthcareRelated(text)) continue;

      posts.push({
        id: `tweakers_${Buffer.from(link || title).toString('base64').slice(0, 16)}`,
        source: 'tweakers',
        text: `${title}. ${this.stripHtml(description)}`.trim(),
        author,
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

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private isHealthcareRelated(text: string): boolean {
    const keywords = ['zorg', 'gezondheid', 'ziekenhuis', 'e-health', 'digitale zorg', 'patiënt', 'medisch', 'ggd'];
    return keywords.some(keyword => text.includes(keyword));
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(this.feedUrl, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      tweakersLogger.error('Tweakers health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}
