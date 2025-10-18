import { describe, it, expectTypeOf } from 'vitest'
import type {
  SentimentLabel,
  SentimentSnapshot,
  Topic,
  Commentary,
  CommentaryStatus,
  RefreshMetadata,
  DashboardPayload,
  RefreshPartialFlag,
} from '../../../src/utils/types'

describe('types', () => {
  it('enforces allowed sentiment labels', () => {
  const _label: SentimentLabel = 'Bleak'
    expectTypeOf<'Bleak' | 'Tense' | 'Mixed' | 'Upbeat' | 'Sunny'>().toEqualTypeOf<SentimentLabel>()
  })

  it('describes the sentiment snapshot shape', () => {
    const snapshot: SentimentSnapshot = {
      windowStart: '2024-04-01T00:00Z',
      windowEnd: '2024-04-01T03:00Z',
      positiveCount: 42,
      neutralCount: 10,
      negativeCount: 5,
      compositeScore: 0.62,
      min30Day: -1,
      max30Day: 1,
      prior12hScores: [0.2, 0.1],
      spikeFlag: false,
    }

    expectTypeOf(snapshot.windowStart).toBeString()
    expectTypeOf(snapshot.prior12hScores).toEqualTypeOf<number[]>()
  })

  it('describes topic metadata', () => {
    const topic: Topic = {
      name: 'interplanetary trade',
      currentMentions3h: 120,
      prevMentions3h: 80,
      growthPercent: 50,
      positivePct: 0.4,
      neutralPct: 0.3,
      negativePct: 0.3,
      netPolarity: 0.1,
      polarizingFlag: false,
      firstSeen: '2024-03-20T00:00Z',
      lastSeen: '2024-04-01T03:00Z',
    }

    expectTypeOf(topic.growthPercent).toEqualTypeOf<number | null>()
    expectTypeOf(topic.polarizingFlag).toBeBoolean()
  })

  it('captures commentary contract expectations', () => {
    const commentary: Commentary = {
      text: 'Markets rebounded after supply concerns eased.',
      createdAt: '2024-04-01T03:05Z',
      includesTopics: ['markets'],
      sentimentLabel: 'Upbeat',
      status: 'success',
      lengthChars: 57,
    }

    expectTypeOf(commentary.status).toEqualTypeOf<CommentaryStatus>()
    expectTypeOf(commentary.sentimentLabel).toEqualTypeOf<SentimentLabel | null>()
  })

  it('covers refresh metadata flags', () => {
    const refresh: RefreshMetadata = {
      lastRefreshAt: '2024-04-01T03:10Z',
      ageMinutes: 5,
      partialFlags: ['topicsMissing'],
      staleFlag: false,
    }

    expectTypeOf(refresh.partialFlags[0]).toEqualTypeOf<RefreshPartialFlag>()
  })

  it('defines the dashboard payload contract', () => {
    const payload: DashboardPayload = {
      snapshot: {
        windowStart: '2024-04-01T00:00Z',
        windowEnd: '2024-04-01T03:00Z',
        positiveCount: 42,
        neutralCount: 10,
        negativeCount: 5,
        compositeScore: 0.62,
        min30Day: -1,
        max30Day: 1,
        prior12hScores: [0.2, 0.15],
        spikeFlag: true,
      },
      topics: [
        {
          name: 'trade',
          currentMentions3h: 10,
          prevMentions3h: 5,
          growthPercent: 100,
          positivePct: 0.5,
          neutralPct: 0.3,
          negativePct: 0.2,
          netPolarity: 0.3,
          polarizingFlag: false,
          firstSeen: '2024-03-20T00:00Z',
          lastSeen: '2024-04-01T03:00Z',
        },
      ],
      commentary: {
        text: 'Steady optimism across trade corridors.',
        createdAt: '2024-04-01T03:05Z',
        includesTopics: ['trade'],
        sentimentLabel: 'Sunny',
        status: 'success',
        lengthChars: 44,
      },
      refresh: {
        lastRefreshAt: '2024-04-01T03:10Z',
        ageMinutes: 5,
        partialFlags: [],
        staleFlag: false,
      },
    }

    expectTypeOf(payload.topics).toEqualTypeOf<Topic[]>()
  })
})
