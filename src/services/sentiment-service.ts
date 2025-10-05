import { ApiError, fetchJson, type FetchJsonOptions } from './api-client'
import type { SentimentSnapshot } from '../utils/types'
import { clampScore } from '../utils/scoring'
import { detectSentimentSpike } from '../utils/validation'

export const SENTIMENT_ENDPOINT = '/api/sentiment/snapshot'

interface SentimentFeedResponse {
  windowStart: string
  windowEnd: string
  positiveCount: number
  neutralCount: number
  negativeCount: number
  compositeScore: number
  min30Day: number
  max30Day: number
  prior12hScores: number[]
  spikeFlag?: boolean
}

const COUNT_FIELDS: Array<keyof Pick<SentimentFeedResponse, 'positiveCount' | 'neutralCount' | 'negativeCount'>> = [
  'positiveCount',
  'neutralCount',
  'negativeCount',
]

function throwValidationError(field: string, message: string): never {
  throw new ApiError({
    endpoint: SENTIMENT_ENDPOINT,
    status: 422,
    retryable: false,
    message: `Invalid sentiment snapshot: ${field} ${message}`,
  })
}

function ensureIsoTimestamp(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throwValidationError(field, 'must be an ISO string')
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throwValidationError(field, 'must be a valid ISO timestamp')
  }

  return value
}

function ensureNonNegativeInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throwValidationError(field, 'must be a finite number')
  }

  if (!Number.isInteger(value)) {
    throwValidationError(field, 'must be an integer')
  }

  if (value < 0) {
    throwValidationError(field, 'must be non-negative')
  }

  return value
}

function ensureScore(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throwValidationError(field, 'must be a finite number')
  }

  return clampScore(value)
}

function ensurePriorScores(value: unknown, field: string): number[] {
  if (!Array.isArray(value)) {
    throwValidationError(field, 'must be an array of numbers')
  }

  if (value.length === 0) {
    throwValidationError(field, 'must contain at least one entry')
  }

  return value.map((score, index) => {
    if (typeof score !== 'number' || !Number.isFinite(score)) {
      throwValidationError(`${field}[${index}]`, 'must be a finite number')
    }

    return clampScore(score)
  })
}

function mapToSnapshot(raw: SentimentFeedResponse): SentimentSnapshot {
  const windowStart = ensureIsoTimestamp(raw.windowStart, 'windowStart')
  const windowEnd = ensureIsoTimestamp(raw.windowEnd, 'windowEnd')

  const counts = COUNT_FIELDS.reduce<Record<string, number>>((acc, field) => {
    acc[field] = ensureNonNegativeInteger(raw[field], field)
    return acc
  }, {}) as Pick<SentimentSnapshot, 'positiveCount' | 'neutralCount' | 'negativeCount'>

  const compositeScore = ensureScore(raw.compositeScore, 'compositeScore')
  const min30Day = ensureScore(raw.min30Day, 'min30Day')
  const max30Day = ensureScore(raw.max30Day, 'max30Day')
  const prior12hScores = ensurePriorScores(raw.prior12hScores, 'prior12hScores')

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

  return mapToSnapshot(raw)
}
