/**
 * Sentiment Analyzer (T008)
 * Analyzes Dutch text sentiment using sentiment library with custom lexicon
 */

import Sentiment from 'sentiment';
import { franc } from 'franc-min';
import type { RawPost, AnalyzedPost, SentimentConfig } from '~/types/sentiment';
import { logger } from '../logger';

const analyzerLogger = logger.child('analyzer');

export class SentimentAnalyzer {
  private sentiment: Sentiment;
  private config: Required<SentimentConfig>;

  constructor(config?: Partial<SentimentConfig>) {
    this.config = {
      dutch_lexicon_path: config?.dutch_lexicon_path || '',
      min_confidence: config?.min_confidence ?? 0.6,
      language_detection_threshold: config?.language_detection_threshold ?? 0.7,
    };

    // Initialize sentiment with Dutch lexicon if provided
    this.sentiment = new Sentiment();
    
    // TODO: Load custom Dutch lexicon from file if path provided
    // For now, using base sentiment library which has some Dutch support
    
    analyzerLogger.info('Sentiment analyzer initialized', {
      min_confidence: this.config.min_confidence,
      language_threshold: this.config.language_detection_threshold,
    });
  }

  /**
   * Analyze a single raw post (FR-002)
   */
  async analyzePost(post: RawPost, topics: string[]): Promise<AnalyzedPost | null> {
    try {
      // Language detection (FR-008)
      const detectedLang = franc(post.text);
      
      if (detectedLang !== 'nld' && detectedLang !== 'und') {
        analyzerLogger.debug('Non-Dutch post filtered', {
          post_id: post.id,
          detected: detectedLang,
        });
        return null;
      }

      // Sentiment analysis
      const result = this.sentiment.analyze(post.text);
      
      // Normalize score to -1.0 to +1.0 range
      // sentiment library returns comparative score which is already normalized
      const normalizedScore = Math.max(-1, Math.min(1, result.comparative));

      return {
        id: post.id,
        source: post.source,
        text: post.text,
        sentiment_score: normalizedScore,
        language: detectedLang === 'nld' ? 'nl' : 'und',
        topics,
        created_at: post.created_at,
        analyzed_at: new Date().toISOString(),
      };
    } catch (error) {
      analyzerLogger.error('Failed to analyze post', {
        post_id: post.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Batch analyze multiple posts
   */
  async analyzeBatch(posts: RawPost[], topicsExtractor: (text: string) => string[]): Promise<AnalyzedPost[]> {
    const analyzed: AnalyzedPost[] = [];

    for (const post of posts) {
      const topics = topicsExtractor(post.text);
      const result = await this.analyzePost(post, topics);
      
      if (result) {
        analyzed.push(result);
      }
    }

    analyzerLogger.info('Batch analysis complete', {
      total_posts: posts.length,
      analyzed: analyzed.length,
      filtered: posts.length - analyzed.length,
    });

    return analyzed;
  }

  /**
   * Calculate aggregate sentiment score from analyzed posts
   */
  calculateAggregateScore(posts: AnalyzedPost[]): number {
    if (posts.length === 0) return 0;

    const sum = posts.reduce((acc, post) => acc + post.sentiment_score, 0);
    return sum / posts.length;
  }
}
