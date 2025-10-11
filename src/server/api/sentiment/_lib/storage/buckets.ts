/**
 * Bucket Storage Manager (T010)
 * File-based storage for hourly sentiment buckets (FR-011)
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import type { SentimentBucket, AnalyzedPost, StorageConfig } from '~/types/sentiment';
import { logger } from '../logger';

const storageLogger = logger.child('storage');

export class BucketManager {
  private config: Required<StorageConfig>;

  constructor(config?: Partial<StorageConfig>) {
    this.config = {
      data_dir: config?.data_dir ?? 'src/server/data/sentiment',
      retention_hours: config?.retention_hours ?? 24,
      bucket_size_minutes: config?.bucket_size_minutes ?? 60,
    };

    storageLogger.info('Bucket manager initialized', {
      data_dir: this.config.data_dir,
      retention_hours: this.config.retention_hours,
    });
  }

  /**
   * Generate bucket ID from timestamp (FR-011)
   * Format: YYYY-MM-DD-HH
   */
  private getBucketId(timestamp: Date): string {
    const year = timestamp.getUTCFullYear();
    const month = String(timestamp.getUTCMonth() + 1).padStart(2, '0');
    const day = String(timestamp.getUTCDate()).padStart(2, '0');
    const hour = String(timestamp.getUTCHours()).padStart(2, '0');
    
    return `${year}-${month}-${day}-${hour}`;
  }

  /**
   * Get file path for bucket
   */
  private getBucketPath(bucketId: string): string {
    return join(this.config.data_dir, `${bucketId}.json`);
  }

  /**
   * Read bucket from disk
   */
  async readBucket(bucketId: string): Promise<SentimentBucket | null> {
    try {
      const path = this.getBucketPath(bucketId);
      const content = await fs.readFile(path, 'utf-8');
      return JSON.parse(content) as SentimentBucket;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        storageLogger.error('Failed to read bucket', {
          bucket_id: bucketId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      return null;
    }
  }

  /**
   * Write bucket to disk
   */
  async writeBucket(bucket: SentimentBucket): Promise<void> {
    try {
      const path = this.getBucketPath(bucket.bucket_id);
      await fs.writeFile(path, JSON.stringify(bucket, null, 2), 'utf-8');
      
      storageLogger.debug('Bucket written', {
        bucket_id: bucket.bucket_id,
        post_count: bucket.post_count,
      });
    } catch (error) {
      storageLogger.error('Failed to write bucket', {
        bucket_id: bucket.bucket_id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Add posts to appropriate buckets
   */
  async addPosts(posts: AnalyzedPost[]): Promise<void> {
    const bucketMap = new Map<string, AnalyzedPost[]>();

    // Group posts by bucket
    for (const post of posts) {
      const timestamp = new Date(post.created_at);
      const bucketId = this.getBucketId(timestamp);
      
      if (!bucketMap.has(bucketId)) {
        bucketMap.set(bucketId, []);
      }
      bucketMap.get(bucketId)!.push(post);
    }

    // Write each bucket
    for (const [bucketId, bucketPosts] of bucketMap) {
      const existing = await this.readBucket(bucketId) || this.createEmptyBucket(bucketId);
      
      // Merge posts (avoid duplicates by ID)
      const existingIds = new Set(existing.posts.map(p => p.id));
      const newPosts = bucketPosts.filter(p => !existingIds.has(p.id));
      
      existing.posts.push(...newPosts);
      existing.post_count = existing.posts.length;
      existing.aggregate_score = this.calculateAggregateScore(existing.posts);

      await this.writeBucket(existing);
    }

    storageLogger.info('Posts added to buckets', {
      total_posts: posts.length,
      buckets_updated: bucketMap.size,
    });
  }

  /**
   * Get all buckets within retention window
   */
  async getRecentBuckets(): Promise<SentimentBucket[]> {
    const cutoff = new Date(Date.now() - (this.config.retention_hours * 60 * 60 * 1000));
    const buckets: SentimentBucket[] = [];

    try {
      const files = await fs.readdir(this.config.data_dir);
      
      for (const file of files) {
        if (!file.endsWith('.json') || file === 'config.json') continue;

        const bucketId = file.replace('.json', '');
        const bucket = await this.readBucket(bucketId);
        
        if (bucket && new Date(bucket.start_time) >= cutoff) {
          buckets.push(bucket);
        }
      }
    } catch (error) {
      storageLogger.error('Failed to read recent buckets', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return buckets.sort((a, b) => a.start_time.localeCompare(b.start_time));
  }

  /**
   * Delete old buckets beyond retention window
   */
  async cleanOldBuckets(): Promise<number> {
    const cutoff = new Date(Date.now() - (this.config.retention_hours * 60 * 60 * 1000));
    let deleted = 0;

    try {
      const files = await fs.readdir(this.config.data_dir);
      
      for (const file of files) {
        if (!file.endsWith('.json') || file === 'config.json') continue;

        const bucketId = file.replace('.json', '');
        const bucket = await this.readBucket(bucketId);
        
        if (bucket && new Date(bucket.start_time) < cutoff) {
          await fs.unlink(this.getBucketPath(bucketId));
          deleted++;
        }
      }

      if (deleted > 0) {
        storageLogger.info('Old buckets cleaned', { deleted_count: deleted });
      }
    } catch (error) {
      storageLogger.error('Failed to clean old buckets', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return deleted;
  }

  /**
   * Create empty bucket structure
   */
  private createEmptyBucket(bucketId: string): SentimentBucket {
    const [year, month, day, hour] = bucketId.split('-').map(Number);
    const startTime = new Date(Date.UTC(year, month - 1, day, hour, 0, 0));
    const endTime = new Date(startTime.getTime() + (this.config.bucket_size_minutes * 60 * 1000));

    return {
      bucket_id: bucketId,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      posts: [],
      aggregate_score: 0,
      post_count: 0,
    };
  }

  /**
   * Calculate aggregate score for posts
   */
  private calculateAggregateScore(posts: AnalyzedPost[]): number {
    if (posts.length === 0) return 0;
    const sum = posts.reduce((acc, post) => acc + post.sentiment_score, 0);
    return sum / posts.length;
  }
}
