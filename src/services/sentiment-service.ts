import { fetchJson, type FetchJsonOptions } from './api-client'
import type { SentimentSnapshot } from '~/types/sentiment'

export const SENTIMENT_ENDPOINT = '/api/sentiment'

export async function getSentimentSnapshot(options?: FetchJsonOptions): Promise<SentimentSnapshot> {
  const snapshot = options
    ? await fetchJson<SentimentSnapshot>(SENTIMENT_ENDPOINT, options)
    : await fetchJson<SentimentSnapshot>(SENTIMENT_ENDPOINT)

  // Validate response structure in development
  if (process.env.NODE_ENV !== 'production') {
    if (snapshot.overall_score === undefined || !snapshot.last_updated) {
      throw new Error('Invalid sentiment snapshot response');
    }
  }

  return snapshot;
}

