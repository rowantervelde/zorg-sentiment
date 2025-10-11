/**
 * In-Memory Cache (T009)
 * Simple TTL-based cache for sentiment snapshots (FR-009)
 */

import type { SentimentSnapshot, CacheConfig } from '~/types/sentiment';
import { logger } from '../logger';

const cacheLogger = logger.child('cache');

interface CacheEntry {
  data: SentimentSnapshot;
  expiry: number; // Unix timestamp
}

export class SentimentCache {
  private cache: Map<string, CacheEntry> = new Map();
  private config: Required<CacheConfig>;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      ttl_minutes: config?.ttl_minutes ?? 15,
      max_entries: config?.max_entries ?? 100,
    };

    cacheLogger.info('Cache initialized', {
      ttl_minutes: this.config.ttl_minutes,
      max_entries: this.config.max_entries,
    });
  }

  /**
   * Get cached snapshot if still valid
   */
  get(key: string = 'default'): SentimentSnapshot | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      cacheLogger.debug('Cache miss', { key });
      return null;
    }

    const now = Date.now();
    if (now > entry.expiry) {
      cacheLogger.debug('Cache expired', { key });
      this.cache.delete(key);
      return null;
    }

    cacheLogger.debug('Cache hit', { key });
    return entry.data;
  }

  /**
   * Store snapshot in cache with TTL
   */
  set(data: SentimentSnapshot, key: string = 'default'): void {
    // Enforce max entries (simple LRU: delete oldest)
    if (this.cache.size >= this.config.max_entries) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
        cacheLogger.debug('Cache eviction', { evicted_key: firstKey });
      }
    }

    const expiry = Date.now() + (this.config.ttl_minutes * 60 * 1000);
    this.cache.set(key, { data, expiry });

    cacheLogger.debug('Cache set', { 
      key, 
      ttl_minutes: this.config.ttl_minutes,
      cache_size: this.cache.size,
    });
  }

  /**
   * Invalidate cache entry
   */
  invalidate(key: string = 'default'): void {
    this.cache.delete(key);
    cacheLogger.debug('Cache invalidated', { key });
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    cacheLogger.info('Cache cleared', { cleared_entries: size });
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; max_entries: number; ttl_minutes: number } {
    return {
      size: this.cache.size,
      max_entries: this.config.max_entries,
      ttl_minutes: this.config.ttl_minutes,
    };
  }
}

// Export singleton instance
export const sentimentCache = new SentimentCache();
