/**
 * Sentiment Analysis Service Type Definitions
 * Feature: 002-sentiment-snapshot-service
 */

/**
 * Main sentiment snapshot response (FR-001, FR-002)
 */
export interface SentimentSnapshot {
  overall_score: number; // -1.0 to +1.0
  trend: 'rising' | 'falling' | 'stable'; // FR-003
  spike_detected: boolean; // FR-004
  spike_direction?: 'positive' | 'negative'; // FR-005, FR-006 - T029
  min_30day?: number; // FR-007 - T033
  max_30day?: number; // FR-007 - T033
  age_minutes: number; // FR-009 - T035
  is_stale: boolean; // FR-009 - T035 (true if age > 30 minutes)
  last_updated: string; // ISO 8601 timestamp
  data_quality: DataQuality;
  topics: TopicSentiment[]; // FR-005
  sources: DataSourceStatus[]; // FR-006
  hourly_buckets: SentimentBucket[]; // FR-004 - 24-hour trend data (T026)
}

/**
 * Data quality metadata (FR-010)
 */
export interface DataQuality {
  sample_size: number; // Total posts analyzed
  confidence: 'high' | 'medium' | 'low'; // Based on sample size
  staleness_minutes: number; // Minutes since last refresh
  language_filter_rate: number; // % of non-Dutch posts filtered
}

/**
 * Topic-level sentiment (FR-005)
 */
export interface TopicSentiment {
  topic_id: string;
  topic_name: string;
  score: number; // -1.0 to +1.0
  sample_size: number; // Posts mentioning this topic
  is_polarizing: boolean; // FR-014: variance > 0.5
}

/**
 * Data source health status (FR-006, FR-021, FR-022)
 */
export interface DataSourceStatus {
  source_id: 'twitter' | 'reddit' | 'mastodon' | 'rss_numl' | 'tweakers';
  status: 'available' | 'unavailable';
  last_success: string; // ISO 8601 timestamp
  error_message?: string;
}

/**
 * Internal: Raw post data from source adapters
 */
export interface RawPost {
  id: string; // Source-specific unique ID
  source: 'twitter' | 'reddit' | 'mastodon' | 'rss_numl' | 'tweakers';
  text: string; // Post content
  author?: string; // Optional author identifier
  created_at: string; // ISO 8601 timestamp
  url?: string; // Optional permalink
}

/**
 * Internal: Analyzed post with sentiment score
 */
export interface AnalyzedPost {
  id: string;
  source: DataSourceStatus['source_id'];
  text: string;
  sentiment_score: number; // -1.0 to +1.0
  language: string; // ISO 639-1 code (e.g., 'nl')
  topics: string[]; // Topic IDs extracted from text
  created_at: string;
  analyzed_at: string;
}

/**
 * Internal: Time bucket for aggregation (FR-011)
 */
export interface SentimentBucket {
  bucket_id: string; // Format: YYYY-MM-DD-HH
  start_time: string; // ISO 8601
  end_time: string; // ISO 8601
  posts: AnalyzedPost[];
  aggregate_score: number; // -1.0 to +1.0
  post_count: number;
}

/**
 * Configuration for sentiment analyzer
 */
export interface SentimentConfig {
  dutch_lexicon_path?: string; // Optional custom lexicon
  min_confidence: number; // Minimum confidence threshold
  language_detection_threshold: number; // Minimum confidence for language
}

/**
 * Configuration for spike detection (FR-004)
 */
export interface SpikeDetectionConfig {
  lookback_hours: number; // Default: 24
  std_dev_threshold: number; // Default: 2.0
  min_sample_size: number; // Default: 50
}

/**
 * Rate limiter configuration per source
 */
export interface RateLimitConfig {
  requests_per_minute: number;
  requests_per_hour: number;
  requests_per_day?: number;
}

/**
 * Storage bucket manager configuration
 */
export interface StorageConfig {
  data_dir: string; // Path to JSON storage directory
  retention_hours: number; // Default: 24
  bucket_size_minutes: number; // Default: 60
}

/**
 * Cache configuration (FR-009)
 */
export interface CacheConfig {
  ttl_minutes: number; // Default: 15
  max_entries: number; // Default: 100
}

/**
 * Error types for graceful degradation (FR-021)
 */
export type SentimentError =
  | { type: 'source_unavailable'; source: DataSourceStatus['source_id']; message: string }
  | { type: 'rate_limit_exceeded'; source: DataSourceStatus['source_id']; retry_after: number }
  | { type: 'parse_error'; source: DataSourceStatus['source_id']; message: string }
  | { type: 'storage_error'; message: string }
  | { type: 'analysis_error'; message: string };
