/**
 * Historical Context Calculator (T032)
 * Computes 30-day min/max sentiment scores for context (FR-007)
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import type { SentimentBucket } from '~/types/sentiment';
import { logger } from '../logger';

const contextLogger = logger.child('historical-context');

export interface HistoricalContextRange {
  min_30day: number;
  max_30day: number;
  min_timestamp: string;
  max_timestamp: string;
  days_analyzed: number;
}

export class HistoricalContextCalculator {
  private dataDir: string;

  constructor() {
    this.dataDir = join(process.cwd(), 'src', 'server', 'data', 'sentiment');
  }

  /**
   * Calculate 30-day min/max sentiment context (FR-007)
   */
  async calculate30DayContext(): Promise<HistoricalContextRange | null> {
    try {
      const buckets = await this.read30DayBuckets();

      if (buckets.length === 0) {
        contextLogger.warn('No historical buckets available for context calculation');
        return null;
      }

      // Find min/max scores
      let minScore = Infinity;
      let maxScore = -Infinity;
      let minTimestamp = '';
      let maxTimestamp = '';

      for (const bucket of buckets) {
        if (bucket.aggregate_score < minScore) {
          minScore = bucket.aggregate_score;
          minTimestamp = bucket.start_time;
        }
        if (bucket.aggregate_score > maxScore) {
          maxScore = bucket.aggregate_score;
          maxTimestamp = bucket.start_time;
        }
      }

      // Count unique days analyzed
      const uniqueDays = new Set(buckets.map(b => b.start_time.slice(0, 10))).size;

      const context: HistoricalContextRange = {
        min_30day: minScore,
        max_30day: maxScore,
        min_timestamp: minTimestamp,
        max_timestamp: maxTimestamp,
        days_analyzed: uniqueDays,
      };

      contextLogger.info('30-day context calculated', {
        min: minScore.toFixed(2),
        max: maxScore.toFixed(2),
        days: uniqueDays,
      });

      return context;
    } catch (error) {
      contextLogger.error('Failed to calculate historical context', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Read bucket files from the last 30 days
   */
  private async read30DayBuckets(): Promise<SentimentBucket[]> {
    const allBuckets: SentimentBucket[] = [];
    const now = new Date();

    // Generate list of dates for last 30 days
    for (let i = 0; i < 30; i++) {
      const targetDate = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const dateStr = targetDate.toISOString().slice(0, 10); // YYYY-MM-DD
      const filename = `buckets-${dateStr}.json`;
      const filepath = join(this.dataDir, filename);

      try {
        const content = await fs.readFile(filepath, 'utf-8');
        const data = JSON.parse(content) as { buckets: SentimentBucket[] };
        
        if (data.buckets && Array.isArray(data.buckets)) {
          allBuckets.push(...data.buckets);
        }
      } catch (error) {
        // File might not exist for this day - that's okay
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          contextLogger.debug('Error reading bucket file', {
            filename,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    contextLogger.debug('Read historical buckets', {
      total_buckets: allBuckets.length,
      days_searched: 30,
    });

    return allBuckets;
  }

  /**
   * Get statistics about available historical data
   */
  async getDataAvailability(): Promise<{ days_with_data: number; oldest_date: string | null }> {
    const now = new Date();
    const datesWithData: string[] = [];

    for (let i = 0; i < 30; i++) {
      const targetDate = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const dateStr = targetDate.toISOString().slice(0, 10);
      const filename = `buckets-${dateStr}.json`;
      const filepath = join(this.dataDir, filename);

      try {
        await fs.access(filepath);
        datesWithData.push(dateStr);
      } catch {
        // File doesn't exist
      }
    }

    return {
      days_with_data: datesWithData.length,
      oldest_date: datesWithData.length > 0 ? datesWithData[datesWithData.length - 1] : null,
    };
  }
}
