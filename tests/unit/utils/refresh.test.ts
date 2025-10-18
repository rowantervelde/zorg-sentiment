import { describe, expect, it } from 'vitest'
import { computeRefreshRecency } from '../../../src/utils/refresh'
import type { Commentary, SentimentSnapshot, Topic } from '../../../src/utils/types'

function buildSnapshot(overrides: Partial<SentimentSnapshot> = {}): SentimentSnapshot {
  return {
    windowStart: new Date('2025-10-08T09:00:00.000Z').toISOString(),
    windowEnd: new Date('2025-10-08T10:00:00.000Z').toISOString(),
    positiveCount: 100,
    neutralCount: 50,
    negativeCount: 25,
    compositeScore: 70,
    min30Day: 30,
    max30Day: 90,
    prior12hScores: Array.from({ length: 12 }, () => 60),
    spikeFlag: false,
    ...overrides,
  }
}

function buildTopic(overrides: Partial<Topic> = {}): Topic {
  return {
    name: 'Sample topic',
    currentMentions3h: 10,
    prevMentions3h: 5,
    positivePct: 40,
    neutralPct: 30,
    negativePct: 30,
    growthPercent: 100,
    netPolarity: 10,
    polarizingFlag: false,
    firstSeen: new Date('2025-10-08T08:00:00.000Z').toISOString(),
    lastSeen: new Date('2025-10-08T09:30:00.000Z').toISOString(),
    ...overrides,
  }
}

function buildCommentary(overrides: Partial<Commentary> = {}): Commentary {
  return {
    status: 'success',
    text: 'All clear',
    createdAt: new Date('2025-10-08T09:45:00.000Z').toISOString(),
    sentimentLabel: 'Upbeat',
    includesTopics: ['Sample topic'],
    lengthChars: 9,
    ...overrides,
  }
}

describe('refresh utilities', () => {
  it('computes age and stale flag using snapshot timestamps', () => {
    const snapshot = buildSnapshot()
    const commentary = buildCommentary()
    const topics = [buildTopic()]

    const now = new Date('2025-10-08T10:15:00.000Z')
    const result = computeRefreshRecency({
      snapshot,
      topics,
      commentary,
      now,
      staleThresholdMinutes: 30,
    })

    expect(result.lastRefreshAt).toBe(snapshot.windowEnd)
    expect(result.ageMinutes).toBe(15)
    expect(result.staleFlag).toBe(false)
  })

  it('falls back to commentary timestamp when snapshot timestamp is invalid', () => {
    const snapshot = buildSnapshot({ windowEnd: 'not-a-date' })
    const commentary = buildCommentary({ createdAt: '2025-10-08T09:50:00.000Z' })
    const topics = [buildTopic({ lastSeen: undefined })]

    const now = new Date('2025-10-08T10:20:00.000Z')
    const result = computeRefreshRecency({
      snapshot,
      topics,
      commentary,
      now,
      staleThresholdMinutes: 45,
    })

    expect(result.lastRefreshAt).toBe('2025-10-08T09:50:00.000Z')
    expect(result.ageMinutes).toBe(30)
    expect(result.staleFlag).toBe(false)
  })

  it('marks data as stale when age exceeds threshold', () => {
    const snapshot = buildSnapshot({ windowEnd: '2025-10-08T09:00:00.000Z' })
    const commentary = buildCommentary({ createdAt: '2025-10-08T09:00:00.000Z' })
    const topics = [buildTopic({ lastSeen: '2025-10-08T08:50:00.000Z' })]

  const now = new Date('2025-10-08T10:00:00.000Z')
    const result = computeRefreshRecency({
      snapshot,
      topics,
      commentary,
      now,
      staleThresholdMinutes: 30,
    })

    expect(result.ageMinutes).toBe(60)
    expect(result.staleFlag).toBe(true)
  })
})
