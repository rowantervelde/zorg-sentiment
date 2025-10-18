import { ApiError } from './api-client'
import { SENTIMENT_LABELS } from '../utils/types'
import { validateTopicPercentages } from '../utils/validation'
import type {
  SentimentFeedResponse,
  TopicsFeedResponse,
  TopicFeedEntry,
  CommentaryFeedResponse,
} from './contracts'
import type { CommentaryStatus, SentimentLabel } from '../utils/types'

const MAX_TEXT_LENGTH = 400
const MAX_TOPIC_REFERENCES = 2

function throwValidationError(endpoint: string, field: string, message: string): never {
  throw new ApiError({
    endpoint,
    status: 422,
    retryable: false,
    message: `Invalid payload: ${field} ${message}`,
  })
}

function ensureIsoTimestamp(value: unknown, endpoint: string, field: string): string {
  if (typeof value !== 'string') {
    throwValidationError(endpoint, field, 'must be an ISO string')
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throwValidationError(endpoint, field, 'must be a valid ISO timestamp')
  }

  return value
}

function ensureNonNegativeInteger(value: unknown, endpoint: string, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throwValidationError(endpoint, field, 'must be a finite number')
  }

  if (!Number.isInteger(value)) {
    throwValidationError(endpoint, field, 'must be an integer')
  }

  if (value < 0) {
    throwValidationError(endpoint, field, 'must be non-negative')
  }

  return value
}

function ensureScore(value: unknown, endpoint: string, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throwValidationError(endpoint, field, 'must be a finite number')
  }

  return value
}

function ensurePercent(value: unknown, endpoint: string, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throwValidationError(endpoint, field, 'must be a finite number')
  }

  if (value < 0 || value > 100) {
    throwValidationError(endpoint, field, 'must be between 0 and 100')
  }

  return Number(value.toFixed(2))
}

function ensureString(
  value: unknown,
  endpoint: string,
  field: string,
  { minLength, maxLength }: { minLength: number; maxLength: number },
): string {
  if (typeof value !== 'string') {
    throwValidationError(endpoint, field, 'must be a string')
  }

  const trimmed = value.trim()
  if (trimmed.length < minLength || trimmed.length > maxLength) {
    throwValidationError(endpoint, field, `must be between ${minLength}-${maxLength} characters`)
  }

  return trimmed
}

function ensurePriorScores(value: unknown, endpoint: string, field: string): number[] {
  if (!Array.isArray(value)) {
    throwValidationError(endpoint, field, 'must be an array of numbers')
  }

  if (value.length === 0) {
    throwValidationError(endpoint, field, 'must contain at least one entry')
  }

  return value.map((score, index) => {
    if (typeof score !== 'number' || !Number.isFinite(score)) {
      throwValidationError(endpoint, `${field}[${index}]`, 'must be a finite number')
    }

    return score
  })
}

function ensureTopicsArray(value: unknown, endpoint: string): TopicFeedEntry[] {
  if (!value || typeof value !== 'object' || !('topics' in (value as TopicsFeedResponse))) {
    throw new ApiError({
      endpoint,
      status: 502,
      retryable: true,
      message: 'Invalid topics payload: topics array missing',
    })
  }

  const topics = (value as TopicsFeedResponse).topics
  if (!Array.isArray(topics)) {
    throw new ApiError({
      endpoint,
      status: 502,
      retryable: true,
      message: 'Invalid topics payload: topics array missing',
    })
  }

  return topics
}

function ensureStatus(value: unknown, endpoint: string): CommentaryStatus {
  if (value === 'success' || value === 'fallback' || value === 'stale') {
    return value
  }

  throwValidationError(endpoint, 'status', 'must be one of success, fallback, or stale')
}

function ensureSentimentLabel(
  value: unknown,
  endpoint: string,
  field: string,
): SentimentLabel {
  if (typeof value !== 'string') {
    throwValidationError(endpoint, field, 'must be a string matching sentiment scale')
  }

  if (!SENTIMENT_LABELS.includes(value as SentimentLabel)) {
    throwValidationError(endpoint, field, 'must match sentiment scale')
  }

  return value as SentimentLabel
}

export function validateSentimentResponse(raw: SentimentFeedResponse, endpoint: string): void {
  ensureIsoTimestamp(raw.windowStart, endpoint, 'windowStart')
  ensureIsoTimestamp(raw.windowEnd, endpoint, 'windowEnd')

  ensureNonNegativeInteger(raw.positiveCount, endpoint, 'positiveCount')
  ensureNonNegativeInteger(raw.neutralCount, endpoint, 'neutralCount')
  ensureNonNegativeInteger(raw.negativeCount, endpoint, 'negativeCount')

  ensureScore(raw.compositeScore, endpoint, 'compositeScore')
  ensureScore(raw.min30Day, endpoint, 'min30Day')
  ensureScore(raw.max30Day, endpoint, 'max30Day')
  ensurePriorScores(raw.prior12hScores, endpoint, 'prior12hScores')
}

export function validateTopicsResponse(value: TopicsFeedResponse, endpoint: string): void {
  const topics = ensureTopicsArray(value, endpoint)

  topics.forEach((entry, index) => {
    ensureString(entry.name, endpoint, `topics[${index}].name`, { minLength: 2, maxLength: 60 })
    ensureNonNegativeInteger(entry.currentMentions3h, endpoint, `topics[${index}].currentMentions3h`)
    ensureNonNegativeInteger(entry.prevMentions3h, endpoint, `topics[${index}].prevMentions3h`)

    const positivePct = ensurePercent(entry.positivePct, endpoint, `topics[${index}].positivePct`)
    const neutralPct = ensurePercent(entry.neutralPct, endpoint, `topics[${index}].neutralPct`)
    const negativePct = ensurePercent(entry.negativePct, endpoint, `topics[${index}].negativePct`)

    if (!validateTopicPercentages({ positivePct, neutralPct, negativePct })) {
      throwValidationError(endpoint, 'percentages', 'must sum to 100±1')
    }

    ensureIsoTimestamp(entry.firstSeen, endpoint, `topics[${index}].firstSeen`)
    ensureIsoTimestamp(entry.lastSeen, endpoint, `topics[${index}].lastSeen`)
  })
}

export function validateCommentaryResponse(payload: CommentaryFeedResponse, endpoint: string): void {
  const status = ensureStatus(payload.status, endpoint)

  if (status === 'fallback') {
    return
  }

  if (typeof payload.text !== 'string') {
    throwValidationError(endpoint, 'text', 'must be present when status is success or stale')
  }

  const trimmed = payload.text.trim()
  if (trimmed.length === 0) {
    throwValidationError(endpoint, 'text', 'must not be empty')
  }

  if (trimmed.length > MAX_TEXT_LENGTH) {
    throwValidationError(endpoint, 'text', `must be ≤${MAX_TEXT_LENGTH} characters`)
  }

  ensureIsoTimestamp(payload.createdAt, endpoint, 'createdAt')
  ensureSentimentLabel(payload.sentimentLabel, endpoint, 'sentimentLabel')

  if (payload.includesTopics != null && !Array.isArray(payload.includesTopics)) {
    throwValidationError(endpoint, 'includesTopics', 'must be an array of topic names')
  }

  if (Array.isArray(payload.includesTopics)) {
    payload.includesTopics.slice(0, MAX_TOPIC_REFERENCES).forEach((topic, index) => {
      ensureString(topic, endpoint, `includesTopics[${index}]`, { minLength: 1, maxLength: 60 })
    })
  }
}
