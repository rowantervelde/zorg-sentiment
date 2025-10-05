import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SentimentSnapshot } from '../../../src/utils/types'
import { getSentimentSnapshot, SENTIMENT_ENDPOINT } from '../../../src/services/sentiment-service'

vi.mock('../../../src/services/api-client', async () => {
  const actual = await vi.importActual<typeof import('../../../src/services/api-client')>(
    '../../../src/services/api-client',
  )
  return {
    ...actual,
    fetchJson: vi.fn(),
  }
})

const { fetchJson, ApiError } = await import('../../../src/services/api-client')

afterEach(() => {
  vi.clearAllMocks()
})

describe('getSentimentSnapshot', () => {
  it('maps sentiment feed response to snapshot', async () => {
    vi.mocked(fetchJson).mockResolvedValue({
      windowStart: '2025-10-05T04:00:00Z',
      windowEnd: '2025-10-05T05:00:00Z',
      positiveCount: 420,
      neutralCount: 320,
      negativeCount: 120,
  compositeScore: 60,
      min30Day: 42,
      max30Day: 90,
      prior12hScores: [55, 54, 56, 57, 58, 59, 60, 61, 62, 63, 62, 61],
    })

    const snapshot = await getSentimentSnapshot()

    expect(snapshot).toEqual<SentimentSnapshot>({
      windowStart: '2025-10-05T04:00:00Z',
      windowEnd: '2025-10-05T05:00:00Z',
      positiveCount: 420,
      neutralCount: 320,
      negativeCount: 120,
  compositeScore: 60,
      min30Day: 42,
      max30Day: 90,
      prior12hScores: [55, 54, 56, 57, 58, 59, 60, 61, 62, 63, 62, 61],
      spikeFlag: false,
    })

    expect(fetchJson).toHaveBeenCalledWith(SENTIMENT_ENDPOINT)
  })

  it('computes spike flag when current score deviates from history', async () => {
    vi.mocked(fetchJson).mockResolvedValue({
      windowStart: '2025-10-05T04:00:00Z',
      windowEnd: '2025-10-05T05:00:00Z',
      positiveCount: 400,
      neutralCount: 200,
      negativeCount: 50,
      compositeScore: 90,
      min30Day: 40,
      max30Day: 95,
      prior12hScores: Array(12).fill(50),
    })

    const snapshot = await getSentimentSnapshot()

    expect(snapshot.spikeFlag).toBe(true)
  })

  it('throws ApiError when payload is invalid', async () => {
    vi.mocked(fetchJson).mockResolvedValue({
      windowStart: '2025-10-05T04:00:00Z',
      windowEnd: '2025-10-05T05:00:00Z',
      positiveCount: -1,
      neutralCount: 320,
      negativeCount: 120,
      compositeScore: 68,
      min30Day: 42,
      max30Day: 90,
      prior12hScores: [55, 54, 56, 57, 58, 59, 60, 61, 62, 63, 62, 61],
    })

    await expect(getSentimentSnapshot()).rejects.toBeInstanceOf(ApiError)
  })
})
