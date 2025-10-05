import { ApiError, fetchJson, type FetchJsonOptions } from './api-client'
import type { Topic } from '../utils/types'
import { calculateNetPolarity, validateTopicPercentages } from '../utils/validation'

export const TOPICS_ENDPOINT = '/api/topics/trending'

interface TopicFeedEntry {
  name: string
  currentMentions3h: number
  prevMentions3h: number
  positivePct: number
  neutralPct: number
  negativePct: number
  firstSeen: string
  lastSeen: string
}

interface TopicsFeedResponse {
  topics: TopicFeedEntry[]
}

const MIN_BASELINE_FOR_GROWTH = 5

function throwValidationError(field: string, message: string): never {
  throw new ApiError({
    endpoint: TOPICS_ENDPOINT,
    status: 422,
    retryable: false,
    message: `Invalid topic entry: ${field} ${message}`,
  })
}

function ensureString(value: unknown, field: string, { minLength, maxLength }: { minLength: number; maxLength: number }): string {
  if (typeof value !== 'string') {
    throwValidationError(field, 'must be a string')
  }

  const trimmed = value.trim()
  if (trimmed.length < minLength || trimmed.length > maxLength) {
    throwValidationError(field, `must be between ${minLength}-${maxLength} characters`)
  }

  return trimmed
}

function ensureIsoString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throwValidationError(field, 'must be an ISO timestamp string')
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

function ensurePercent(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throwValidationError(field, 'must be a finite number')
  }

  if (value < 0 || value > 100) {
    throwValidationError(field, 'must be between 0 and 100')
  }

  return Number(value.toFixed(2))
}

function computeGrowthPercent(current: number, previous: number): number | null {
  if (previous < MIN_BASELINE_FOR_GROWTH) {
    return null
  }

  if (previous === 0) {
    return null
  }

  const growth = ((current - previous) / previous) * 100
  return Number(growth.toFixed(1))
}

function isPolarizing(positivePct: number, negativePct: number): boolean {
  return positivePct >= 35 && negativePct >= 35
}

function normaliseTopicEntry(entry: TopicFeedEntry): Topic {
  const name = ensureString(entry.name, 'name', { minLength: 2, maxLength: 60 })
  const currentMentions3h = ensureNonNegativeInteger(entry.currentMentions3h, 'currentMentions3h')
  const prevMentions3h = ensureNonNegativeInteger(entry.prevMentions3h, 'prevMentions3h')

  const positivePct = ensurePercent(entry.positivePct, 'positivePct')
  const neutralPct = ensurePercent(entry.neutralPct, 'neutralPct')
  const negativePct = ensurePercent(entry.negativePct, 'negativePct')

  if (!validateTopicPercentages({ positivePct, neutralPct, negativePct })) {
    throwValidationError('percentages', 'must sum to 100±1')
  }

  const firstSeen = ensureIsoString(entry.firstSeen, 'firstSeen')
  const lastSeen = ensureIsoString(entry.lastSeen, 'lastSeen')

  const growthPercent = computeGrowthPercent(currentMentions3h, prevMentions3h)
  const netPolarity = Number(calculateNetPolarity(positivePct, negativePct).toFixed(2))
  const polarizingFlag = isPolarizing(positivePct, negativePct)

  return {
    name,
    currentMentions3h,
    prevMentions3h,
    growthPercent,
    positivePct,
    neutralPct,
    negativePct,
    netPolarity,
    polarizingFlag,
    firstSeen,
    lastSeen,
  }
}

function sortTopics(topics: Topic[]): Topic[] {
  return [...topics].sort((a, b) => {
    const aGrowth = a.growthPercent ?? Number.NEGATIVE_INFINITY
    const bGrowth = b.growthPercent ?? Number.NEGATIVE_INFINITY

    if (bGrowth !== aGrowth) {
      return bGrowth - aGrowth
    }

    return b.currentMentions3h - a.currentMentions3h
  })
}

export async function getTrendingTopics(options?: FetchJsonOptions): Promise<Topic[]> {
  const response = options
    ? await fetchJson<TopicsFeedResponse>(TOPICS_ENDPOINT, options)
    : await fetchJson<TopicsFeedResponse>(TOPICS_ENDPOINT)

  if (!response || !Array.isArray(response.topics)) {
    throw new ApiError({
      endpoint: TOPICS_ENDPOINT,
      status: 502,
      retryable: true,
      message: 'Invalid topics payload: topics array missing',
    })
  }

  const topics = response.topics.map(normaliseTopicEntry)
  return sortTopics(topics)
}