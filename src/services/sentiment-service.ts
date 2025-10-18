import { fetchJson, type FetchJsonOptions } from './api-client'
import type { SentimentSnapshot } from '../utils/types'
import { clampScore } from '../utils/scoring'
import { detectSentimentSpike } from '../utils/validation'
import type { SentimentFeedResponse } from './contracts'

export const SENTIMENT_ENDPOINT = '/api/sentiment/snapshot'

const COUNT_FIELDS: Array<keyof Pick<SentimentFeedResponse, 'positiveCount' | 'neutralCount' | 'negativeCount'>> = [
  'positiveCount',
  'neutralCount',
  'negativeCount',
]

function coerceTimestamp(value: unknown, fallback: string): string {
  if (typeof value === 'string') {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return value
    }
  }

  return fallback
}

function coerceCount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(value))
  }

  return 0
}

function coerceScore(value: unknown, fallback: number): number {
  const candidate = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return clampScore(candidate)
}

function coerceScoreList(values: unknown, fallback: number): number[] {
  if (!Array.isArray(values)) {
    return [fallback]
  }

  const sanitised = values
    .filter((score): score is number => typeof score === 'number' && Number.isFinite(score))
    .map(clampScore)

  return sanitised.length > 0 ? sanitised : [fallback]
}

function mapToSnapshot(raw: SentimentFeedResponse): SentimentSnapshot {
  const nowIso = new Date().toISOString()
  const windowStart = coerceTimestamp(raw.windowStart, nowIso)
  const windowEnd = coerceTimestamp(raw.windowEnd, windowStart)

  const counts = COUNT_FIELDS.reduce<Record<string, number>>((acc, field) => {
    acc[field] = coerceCount(raw[field])
    return acc
  }, {}) as Pick<SentimentSnapshot, 'positiveCount' | 'neutralCount' | 'negativeCount'>

  const compositeScore = coerceScore(raw.compositeScore, 0)
  const min30Day = coerceScore(raw.min30Day, compositeScore)
  const max30Day = coerceScore(raw.max30Day, compositeScore)
  const prior12hScores = coerceScoreList(raw.prior12hScores, compositeScore)

  const spikeFlag =
    typeof raw.spikeFlag === 'boolean'
      ? raw.spikeFlag
      : detectSentimentSpike(compositeScore, prior12hScores)

  return {
    windowStart,
    windowEnd,
    ...counts,
    compositeScore,
    min30Day,
    max30Day,
    prior12hScores,
    spikeFlag,
  }
}

export async function getSentimentSnapshot(options?: FetchJsonOptions): Promise<SentimentSnapshot> {
  const raw = options
    ? await fetchJson<SentimentFeedResponse>(SENTIMENT_ENDPOINT, options)
    : await fetchJson<SentimentFeedResponse>(SENTIMENT_ENDPOINT)

  if (process.env.NODE_ENV !== 'production') {
    const { validateSentimentResponse } = await import('./dev-validators')
    validateSentimentResponse(raw, SENTIMENT_ENDPOINT)
  }

  return mapToSnapshot(raw)
}
