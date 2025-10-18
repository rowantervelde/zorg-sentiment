import { ApiError, fetchJson, type FetchJsonOptions } from './api-client'
import type { Topic } from '../utils/types'
import { calculateNetPolarity, validateTopicPercentages } from '../utils/validation'
import type { TopicFeedEntry, TopicsFeedResponse } from './contracts'

export const TOPICS_ENDPOINT = '/api/topics/trending'

const MIN_BASELINE_FOR_GROWTH = 5
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

function coerceTimestamp(value: unknown, fallback: string): string {
  if (typeof value === 'string') {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) {
      return value
    }
  }

  return fallback
}

function coerceTopicName(value: unknown): string {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.length > 0) {
      return trimmed
    }
  }

  return 'Onbekend onderwerp'
}

function coerceCount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(value))
  }

  return 0
}

function coercePercent(value: unknown): number {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : 0
  return Number(Math.min(100, Math.max(0, numeric)).toFixed(2))
}

function normalisePercents(positivePct: number, neutralPct: number, negativePct: number) {
  if (validateTopicPercentages({ positivePct, neutralPct, negativePct })) {
    return { positivePct, neutralPct, negativePct }
  }

  const total = positivePct + neutralPct + negativePct

  if (total <= 0) {
    return { positivePct: 0, neutralPct: 0, negativePct: 0 }
  }

  const scale = 100 / total

  return {
    positivePct: Number((positivePct * scale).toFixed(2)),
    neutralPct: Number((neutralPct * scale).toFixed(2)),
    negativePct: Number((negativePct * scale).toFixed(2)),
  }
}

function normaliseTopicEntry(entry: TopicFeedEntry): Topic {
  const name = coerceTopicName(entry.name)
  const currentMentions3h = coerceCount(entry.currentMentions3h)
  const prevMentions3h = coerceCount(entry.prevMentions3h)

  const positiveOrig = coercePercent(entry.positivePct)
  const neutralOrig = coercePercent(entry.neutralPct)
  const negativeOrig = coercePercent(entry.negativePct)

  const { positivePct, neutralPct, negativePct } = normalisePercents(positiveOrig, neutralOrig, negativeOrig)

  const fallbackTimestamp = new Date().toISOString()
  const firstSeen = coerceTimestamp(entry.firstSeen, fallbackTimestamp)
  const lastSeen = coerceTimestamp(entry.lastSeen, firstSeen)

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

  if (process.env.NODE_ENV !== 'production') {
    const { validateTopicsResponse } = await import('./dev-validators')
    validateTopicsResponse(response, TOPICS_ENDPOINT)
  }

  const topics = response.topics.map(normaliseTopicEntry)
  return sortTopics(topics)
}