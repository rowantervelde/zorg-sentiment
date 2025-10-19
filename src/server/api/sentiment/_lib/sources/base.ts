/**
 * Base Data Source Interface (T006)
 * All source adapters implement this interface for consistent aggregation
 */

import type { RawPost, DataSourceStatus } from '~/types/sentiment';

export interface IDataSource {
  /**
   * Unique identifier for this source
   */
  readonly sourceId: DataSourceStatus['source_id'];

  /**
   * Fetch recent posts from this source
   * @param sinceTimestamp - ISO 8601 timestamp to fetch posts after
   * @param maxPosts - Maximum number of posts to fetch
   * @returns Promise resolving to array of raw posts
   * @throws {SentimentError} On source unavailability or rate limits
   */
  fetchPosts(sinceTimestamp: string, maxPosts: number): Promise<RawPost[]>;

  /**
   * Get current health status of this source (FR-021)
   * @returns Current source status including availability and last success
   */
  getStatus(): Promise<DataSourceStatus>;

  /**
   * Test connectivity to the source
   * @returns true if source is reachable and authenticated
   */
  healthCheck(): Promise<boolean>;
}

/**
 * Base class with common functionality for source adapters
 */
export abstract class BaseDataSource implements IDataSource {
  abstract readonly sourceId: DataSourceStatus['source_id'];
  protected lastSuccess: string = new Date().toISOString();
  protected lastError?: string;

  abstract fetchPosts(sinceTimestamp: string, maxPosts: number): Promise<RawPost[]>;
  abstract healthCheck(): Promise<boolean>;

  async getStatus(): Promise<DataSourceStatus> {
    const isAvailable = await this.healthCheck();
    
    return {
      source_id: this.sourceId,
      status: isAvailable ? 'available' : 'unavailable',
      last_success: this.lastSuccess,
      error_message: this.lastError,
    };
  }

  /**
   * Update tracking after successful fetch
   */
  protected markSuccess(): void {
    this.lastSuccess = new Date().toISOString();
    this.lastError = undefined;
  }

  /**
   * Update tracking after failed fetch
   */
  protected markError(error: string): void {
    this.lastError = error;
  }
}
