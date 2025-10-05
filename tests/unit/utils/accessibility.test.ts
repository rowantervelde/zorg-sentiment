import { describe, expect, it } from 'vitest'
import { buildAccessibilitySummary, buildSnapshotSummary } from '../../../src/utils/accessibility'
import type { DashboardPayload, Topic } from '../../../src/utils/types'

const createTopic = (overrides: Partial<Topic> = {}): Topic => ({
  name: 'premie',
  currentMentions3h: 120,
  prevMentions3h: 60,
  growthPercent: 100,
  positivePct: 55,
  neutralPct: 25,
  negativePct: 20,
  netPolarity: 35,
  polarizingFlag: false,
  firstSeen: '2025-09-30T10:00:00Z',
  lastSeen: '2025-10-04T07:55:00Z',
  ...overrides,
})

const basePayload: DashboardPayload = {
  snapshot: {
    windowStart: '2025-10-04T07:00:00Z',
    windowEnd: '2025-10-04T08:00:00Z',
    positiveCount: 420,
    neutralCount: 320,
    negativeCount: 120,
    compositeScore: 72,
    min30Day: 40,
    max30Day: 90,
    prior12hScores: [54, 55, 56, 57, 58, 59, 60, 61, 62, 59, 58, 57],
    spikeFlag: true,
  },
  topics: [
    createTopic({ name: 'premie', growthPercent: 45.2, netPolarity: 12, polarizingFlag: true }),
    createTopic({ name: 'dekking', growthPercent: 18.4, positivePct: 40, negativePct: 35, netPolarity: 5 }),
    createTopic({ name: 'eigen risico', growthPercent: null, positivePct: 30, negativePct: 50, netPolarity: -20 }),
    createTopic({ name: 'zorgtoeslag', growthPercent: 9.5, positivePct: 60, negativePct: 15, netPolarity: 45 }),
  ],
  commentary: {
    text: 'Mood leans upbeat with chatter around premie and dekking.',
    createdAt: '2025-10-04T07:55:00Z',
    includesTopics: ['premie', 'dekking'],
    sentimentLabel: 'Sunny',
    status: 'success',
    lengthChars: 68,
  },
  refresh: {
    lastRefreshAt: '2025-10-04T08:05:00Z',
    ageMinutes: 12,
    partialFlags: [],
    staleFlag: false,
  },
}

describe('accessibility utilities', () => {
  it('summarizes snapshot metrics with spike and freshness status', () => {
    const summary = buildSnapshotSummary(basePayload)

    expect(summary).toContain('Composite sentiment 72 (Upbeat).')
    expect(summary).toContain('Counts — positive 420, neutral 320, negative 120.')
    expect(summary).toContain('Data refreshed 12m ago.')
    expect(summary).toContain('Spike detected compared to previous trend')
    expect(summary).toContain('30-day range 40 to 90.')
  })

  it('notes stale data when refresh flag set', () => {
    const summary = buildSnapshotSummary({
      ...basePayload,
      refresh: {
        ...basePayload.refresh,
        ageMinutes: 80,
        staleFlag: true,
      },
    })

    expect(summary).toContain('Snapshot flagged as stale; consider data provisional.')
    expect(summary).not.toContain('Data refreshed')
  })

  it('builds accessibility summary with limited topics and commentary', () => {
    const summary = buildAccessibilitySummary(basePayload, { topicLimit: 2 })

    expect(summary).toContain('Composite sentiment 72 (Upbeat).')
    expect(summary).toContain('Commentary (Sunny): Mood leans upbeat with chatter around premie and dekking.')
    expect(summary).toContain('Topics:')
    expect(summary).toContain('1. premie: 45.2% growth, positive 55%, negative 20%, net polarity 12%, polarizing.')
    expect(summary).toContain('2. dekking: 18.4% growth, positive 40%, negative 35%, net polarity 5%, balanced.')
    expect(summary).not.toContain('3. eigen risico')
  })

  it('falls back when commentary text is missing and topics empty', () => {
    const summary = buildAccessibilitySummary({
      ...basePayload,
      topics: [],
      commentary: {
        ...basePayload.commentary,
        text: null,
        includesTopics: [],
        sentimentLabel: null,
        status: 'fallback',
      },
    })

    expect(summary).toContain('No active topics in current window.')
    expect(summary).toContain('Commentary unavailable.')
  })
})
