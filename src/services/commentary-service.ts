import { ApiError, fetchJson, type FetchJsonOptions } from './api-client'
import { SENTIMENT_LABELS } from '../utils/types'
import type { Commentary, CommentaryStatus, SentimentLabel } from '../utils/types'

export const COMMENTARY_ENDPOINT = '/api/commentary/current'

const MAX_TEXT_LENGTH = 400
const MAX_TOPIC_REFERENCES = 2

type CommentaryFeedResponse =
  | {
      status: Exclude<CommentaryStatus, 'fallback'>
      text: unknown
      createdAt: unknown
      sentimentLabel: unknown
      includesTopics?: unknown
    }
  | {
      status: 'fallback'
      text?: unknown
      createdAt?: unknown
      sentimentLabel?: unknown
      includesTopics?: unknown
    }

function throwValidationError(field: string, message: string): never {
  throw new ApiError({
    endpoint: COMMENTARY_ENDPOINT,
    status: 422,
    retryable: false,
    message: `Invalid commentary payload: ${field} ${message}`,
  })
}

function ensureStatus(value: unknown): CommentaryStatus {
  if (value !== 'success' && value !== 'fallback' && value !== 'stale') {
    throwValidationError('status', 'must be one of success, fallback, or stale')
  }

  return value
}

function ensureText(value: unknown, status: CommentaryStatus): string | null {
  if (status === 'fallback') {
    return null
  }

  if (typeof value !== 'string') {
    throwValidationError('text', 'must be present when status is success or stale')
  }

  const trimmed = value.trim()

  if (trimmed.length === 0) {
    throwValidationError('text', 'must not be empty')
  }

  if (trimmed.length > MAX_TEXT_LENGTH) {
    throwValidationError('text', `must be ≤${MAX_TEXT_LENGTH} characters`)
  }

  return trimmed
}

function ensureIsoTimestamp(value: unknown, status: CommentaryStatus): string | null {
  if (status === 'fallback') {
    return null
  }

  if (typeof value !== 'string') {
    throwValidationError('createdAt', 'must be an ISO timestamp string')
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throwValidationError('createdAt', 'must be a valid ISO timestamp')
  }

  return value
}

function ensureSentimentLabel(value: unknown, status: CommentaryStatus): SentimentLabel | null {
  if (status === 'fallback') {
    return null
  }

  if (typeof value !== 'string') {
    throwValidationError('sentimentLabel', 'must be a string matching sentiment scale')
  }

  if (!SENTIMENT_LABELS.includes(value as SentimentLabel)) {
    throwValidationError('sentimentLabel', 'must match sentiment scale')
  }

  return value as SentimentLabel
}

function ensureTopics(value: unknown): string[] {
  if (value == null) {
    return []
  }

  if (!Array.isArray(value)) {
    throwValidationError('includesTopics', 'must be an array of topic names')
  }

  const trimmed = value
    .slice(0, MAX_TOPIC_REFERENCES)
    .map((topic, index) => {
      if (typeof topic !== 'string') {
        throwValidationError(`includesTopics[${index}]`, 'must be a string')
      }

      const cleaned = topic.trim()

      if (cleaned.length === 0) {
        throwValidationError(`includesTopics[${index}]`, 'must not be empty')
      }

      if (cleaned.length > 60) {
        throwValidationError(`includesTopics[${index}]`, 'must be ≤60 characters')
      }

      return cleaned
    })

  return trimmed
}

function normaliseCommentary(raw: CommentaryFeedResponse): Commentary {
  const status = ensureStatus(raw.status)

  if (status === 'fallback') {
    return {
      text: null,
      createdAt: null,
      sentimentLabel: null,
      includesTopics: [],
      status,
      lengthChars: 0,
    }
  }

  const text = ensureText(raw.text, status)
  const createdAt = ensureIsoTimestamp(raw.createdAt, status)
  const sentimentLabel = ensureSentimentLabel(raw.sentimentLabel, status)
  const includesTopics = ensureTopics(raw.includesTopics)

  return {
    text,
    createdAt,
    sentimentLabel,
    includesTopics,
    status,
    lengthChars: text?.length ?? 0,
  }
}

export async function getCommentary(options?: FetchJsonOptions): Promise<Commentary> {
  const payload = options
    ? await fetchJson<CommentaryFeedResponse>(COMMENTARY_ENDPOINT, options)
    : await fetchJson<CommentaryFeedResponse>(COMMENTARY_ENDPOINT)

  if (!payload || typeof payload !== 'object' || !('status' in payload)) {
    throw new ApiError({
      endpoint: COMMENTARY_ENDPOINT,
      status: 502,
      retryable: true,
      message: 'Invalid commentary payload: status missing',
    })
  }

  return normaliseCommentary(payload)
}
