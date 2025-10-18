import { ApiError, fetchJson, type FetchJsonOptions } from './api-client'
import { SENTIMENT_LABELS } from '../utils/types'
import type { Commentary, CommentaryStatus, SentimentLabel } from '../utils/types'
import type { CommentaryFeedResponse } from './contracts'

export const COMMENTARY_ENDPOINT = '/api/commentary/current'

const MAX_TEXT_LENGTH = 400
const MAX_TOPIC_REFERENCES = 2
const FALLBACK_COMMENTARY: Commentary = {
  text: null,
  createdAt: null,
  sentimentLabel: null,
  includesTopics: [],
  status: 'fallback',
  lengthChars: 0,
}

function coerceStatus(value: unknown): CommentaryStatus {
  if (value === 'success' || value === 'stale') {
    return value
  }

  return 'fallback'
}

function coerceText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()

  if (trimmed.length === 0) {
    return null
  }

  return trimmed.slice(0, MAX_TEXT_LENGTH)
}

function coerceIsoTimestamp(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : value
}

function coerceSentimentLabel(value: unknown): SentimentLabel | null {
  if (typeof value !== 'string') {
    return null
  }

  return SENTIMENT_LABELS.includes(value as SentimentLabel) ? (value as SentimentLabel) : null
}

function coerceTopics(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .slice(0, MAX_TOPIC_REFERENCES)
    .map((topic) => (typeof topic === 'string' ? topic.trim() : ''))
    .filter((topic) => topic.length > 0 && topic.length <= 60)
}

function normaliseCommentary(raw: CommentaryFeedResponse): Commentary {
  const status = coerceStatus(raw.status)

  if (status === 'fallback') {
    return FALLBACK_COMMENTARY
  }

  const text = coerceText(raw.text)
  const createdAt = coerceIsoTimestamp(raw.createdAt)
  const sentimentLabel = coerceSentimentLabel(raw.sentimentLabel)
  const includesTopics = coerceTopics(raw.includesTopics)

  if (!text || !createdAt || !sentimentLabel) {
    return { ...FALLBACK_COMMENTARY, includesTopics }
  }

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

  if (process.env.NODE_ENV !== 'production') {
    const { validateCommentaryResponse } = await import('./dev-validators')
    validateCommentaryResponse(payload, COMMENTARY_ENDPOINT)
  }

  return normaliseCommentary(payload)
}
