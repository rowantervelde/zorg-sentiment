import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../src/services/api-client'
import { getDashboardPayload, STALE_THRESHOLD_MINUTES } from '../../../src/services/refresh-service'
import type { Commentary, Topic } from '../../../src/utils/types'

vi.mock('../../../src/services/sentiment-service', () => ({
  getSentimentSnapshot: vi.fn(),
}))

vi.mock('../../../src/services/topics-service', () => ({
  getTrendingTopics: vi.fn(),
}))

vi.mock('../../../src/services/commentary-service', () => ({
  getCommentary: vi.fn(),
}))

const { getSentimentSnapshot } = await import('../../../src/services/sentiment-service')
const { getTrendingTopics } = await import('../../../src/services/topics-service')
const { getCommentary } = await import('../../../src/services/commentary-service')

afterEach(() => {
  vi.clearAllMocks()
})

describe('getDashboardPayload', () => {
  it('aggregates services into a cohesive payload with freshness metadata', async () => {
    const now = new Date('2025-10-05T05:00:00Z')

    vi.mocked(getSentimentSnapshot).mockResolvedValue({
      windowStart: '2025-10-05T03:00:00Z',
      windowEnd: '2025-10-05T04:45:00Z',
      positiveCount: 120,
      neutralCount: 80,
      negativeCount: 40,
      compositeScore: 64,
      min30Day: 35,
      max30Day: 88,
      prior12hScores: [50, 52, 55, 57, 58, 59, 60, 61, 62, 63, 64, 60],
      spikeFlag: false,
    })

    const topics: Topic[] = [
      {
        name: 'premie',
        currentMentions3h: 100,
        prevMentions3h: 60,
        growthPercent: 66.7,
        positivePct: 45,
        neutralPct: 25,
        negativePct: 30,
        netPolarity: 15,
        polarizingFlag: false,
        firstSeen: '2025-09-30T10:00:00Z',
        lastSeen: '2025-10-05T04:40:00Z',
      },
    ]

    vi.mocked(getTrendingTopics).mockResolvedValue(topics)

    const commentary: Commentary = {
      text: 'Mood is Mixed edging Upbeat; premie keeps chirping.',
      createdAt: '2025-10-05T04:50:00Z',
      includesTopics: ['premie'],
      sentimentLabel: 'Mixed',
      status: 'success',
      lengthChars: 58,
    }

    vi.mocked(getCommentary).mockResolvedValue(commentary)

    const payload = await getDashboardPayload({
      now: () => now,
    })

    expect(payload.snapshot.windowEnd).toBe('2025-10-05T04:45:00Z')
    expect(payload.topics).toEqual(topics)
    expect(payload.commentary).toEqual(commentary)
  expect(payload.refresh.partialFlags).toEqual([])
  expect(payload.refresh.lastRefreshAt).toBe(new Date(commentary.createdAt as string).toISOString())
    expect(payload.refresh.ageMinutes).toBe(10)
    expect(payload.refresh.staleFlag).toBe(false)
  })

  it('returns empty topics array and sets partial flag when topics fail', async () => {
    vi.mocked(getSentimentSnapshot).mockResolvedValue({
      windowStart: '2025-10-05T03:00:00Z',
      windowEnd: '2025-10-05T04:00:00Z',
      positiveCount: 100,
      neutralCount: 50,
      negativeCount: 30,
      compositeScore: 60,
      min30Day: 30,
      max30Day: 90,
      prior12hScores: [50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61],
      spikeFlag: false,
    })

    vi.mocked(getTrendingTopics).mockRejectedValue(
      new ApiError({
        endpoint: '/api/topics/trending',
        status: 502,
        retryable: true,
        message: 'Bad gateway',
      }),
    )

    vi.mocked(getCommentary).mockResolvedValue({
      text: 'Fresh commentary',
      createdAt: '2025-10-05T04:05:00Z',
      includesTopics: [],
      sentimentLabel: 'Upbeat',
      status: 'success',
      lengthChars: 17,
    })

    const payload = await getDashboardPayload({
      now: () => new Date('2025-10-05T04:10:00Z'),
    })

    expect(payload.topics).toEqual([])
    expect(payload.refresh.partialFlags).toContain('topicsMissing')
  })

  it('flags missing commentary when service reports fallback', async () => {
    vi.mocked(getSentimentSnapshot).mockResolvedValue({
      windowStart: '2025-10-05T03:00:00Z',
      windowEnd: '2025-10-05T04:00:00Z',
      positiveCount: 100,
      neutralCount: 60,
      negativeCount: 20,
      compositeScore: 65,
      min30Day: 32,
      max30Day: 90,
      prior12hScores: [50, 52, 51, 54, 53, 52, 55, 57, 59, 60, 62, 61],
      spikeFlag: false,
    })

    vi.mocked(getTrendingTopics).mockResolvedValue([])

    vi.mocked(getCommentary).mockResolvedValue({
      text: null,
      createdAt: null,
      includesTopics: [],
      sentimentLabel: null,
      status: 'fallback',
      lengthChars: 0,
    })

    const payload = await getDashboardPayload({
      now: () => new Date('2025-10-05T04:45:00Z'),
    })

    expect(payload.commentary.status).toBe('fallback')
    expect(payload.refresh.partialFlags).toContain('commentaryMissing')
    expect(payload.refresh.partialFlags).toContain('topicsMissing')
  })

  it('produces fallback commentary when commentary fetch fails', async () => {
    vi.mocked(getSentimentSnapshot).mockResolvedValue({
      windowStart: '2025-10-05T03:00:00Z',
      windowEnd: '2025-10-05T04:00:00Z',
      positiveCount: 100,
      neutralCount: 60,
      negativeCount: 20,
      compositeScore: 65,
      min30Day: 32,
      max30Day: 90,
      prior12hScores: [50, 52, 51, 54, 53, 52, 55, 57, 59, 60, 62, 61],
      spikeFlag: false,
    })

    vi.mocked(getTrendingTopics).mockResolvedValue([])

    vi.mocked(getCommentary).mockRejectedValue(
      new ApiError({
        endpoint: '/api/commentary/current',
        status: 500,
        retryable: true,
        message: 'Unavailable',
      }),
    )

    const payload = await getDashboardPayload({
      now: () => new Date('2025-10-05T04:30:00Z'),
    })

    expect(payload.commentary).toMatchObject({
      text: null,
      status: 'fallback',
      includesTopics: [],
    })
    expect(payload.refresh.partialFlags).toContain('commentaryMissing')
  })

  it('marks payload as stale when max timestamp lags beyond threshold', async () => {
    vi.mocked(getSentimentSnapshot).mockResolvedValue({
      windowStart: '2025-10-05T01:00:00Z',
      windowEnd: '2025-10-05T02:00:00Z',
      positiveCount: 80,
      neutralCount: 40,
      negativeCount: 30,
      compositeScore: 58,
      min30Day: 40,
      max30Day: 85,
      prior12hScores: [45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56],
      spikeFlag: false,
    })

    vi.mocked(getTrendingTopics).mockResolvedValue([
      {
        name: 'dekking',
        currentMentions3h: 20,
        prevMentions3h: 10,
        growthPercent: 100,
        positivePct: 35,
        neutralPct: 25,
        negativePct: 40,
        netPolarity: -5,
        polarizingFlag: true,
        firstSeen: '2025-09-30T10:00:00Z',
        lastSeen: '2025-10-05T02:00:00Z',
      },
    ])

    vi.mocked(getCommentary).mockResolvedValue({
      text: 'Earlier commentary.',
      createdAt: '2025-10-05T02:00:00Z',
      includesTopics: ['dekking'],
      sentimentLabel: 'Tense',
      status: 'success',
      lengthChars: 21,
    })

    const now = new Date('2025-10-05T03:05:00Z')

    const payload = await getDashboardPayload({ now: () => now })

    const expectedAge = Math.floor((now.getTime() - new Date('2025-10-05T02:00:00Z').getTime()) / 60000)

    expect(payload.refresh.ageMinutes).toBe(expectedAge)
    expect(payload.refresh.staleFlag).toBe(expectedAge > STALE_THRESHOLD_MINUTES)
  })

  it('passes request options to underlying services', async () => {
    vi.mocked(getSentimentSnapshot).mockResolvedValue({
      windowStart: '2025-10-05T03:00:00Z',
      windowEnd: '2025-10-05T04:00:00Z',
      positiveCount: 100,
      neutralCount: 60,
      negativeCount: 20,
      compositeScore: 65,
      min30Day: 32,
      max30Day: 90,
      prior12hScores: [50, 52, 51, 54, 53, 52, 55, 57, 59, 60, 62, 61],
      spikeFlag: false,
    })

    vi.mocked(getTrendingTopics).mockResolvedValue([])

    vi.mocked(getCommentary).mockResolvedValue({
      text: null,
      createdAt: null,
      includesTopics: [],
      sentimentLabel: null,
      status: 'fallback',
      lengthChars: 0,
    })

    const signal = new AbortController().signal

    await getDashboardPayload({
      now: () => new Date('2025-10-05T04:00:00Z'),
      requests: {
        sentiment: { headers: { 'x-sentiment': '1' } },
        topics: { headers: { 'x-topics': '1' }, method: 'POST' },
        commentary: { signal },
      },
    })

    expect(getSentimentSnapshot).toHaveBeenCalledWith({ headers: { 'x-sentiment': '1' } })
    expect(getTrendingTopics).toHaveBeenCalledWith({ headers: { 'x-topics': '1' }, method: 'POST' })
    expect(getCommentary).toHaveBeenCalledWith({ signal })
  })

  it('propagates sentiment fetch failures', async () => {
    const error = new ApiError({
      endpoint: '/api/sentiment/snapshot',
      status: 500,
      retryable: true,
      message: 'Boom',
    })

    vi.mocked(getSentimentSnapshot).mockRejectedValue(error)

    await expect(
      getDashboardPayload({
        now: () => new Date('2025-10-05T04:00:00Z'),
      }),
    ).rejects.toBe(error)
  })
})
