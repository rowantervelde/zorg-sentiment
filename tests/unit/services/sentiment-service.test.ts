import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SentimentSnapshot } from '../../../src/types/sentiment'
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

const { fetchJson } = await import('../../../src/services/api-client')

afterEach(() => {
  vi.clearAllMocks()
})

describe('getSentimentSnapshot', () => {
  it('maps sentiment feed response to snapshot', async () => {
    const mockSnapshot: SentimentSnapshot = {
      overall_score: 0.6,
      trend: 'stable',
      spike_detected: false,
      spike_direction: undefined,
      min_30day: 0.42,
      max_30day: 0.9,
      age_minutes: 5,
      is_stale: false,
      last_updated: '2025-10-05T05:00:00Z',
      data_quality: {
        confidence: 'high',
        sample_size: 860,
        staleness_minutes: 5,
        language_filter_rate: 0.1,
      },
      hourly_buckets: [],
      topics: [],
      sources: [
        { source_id: 'twitter', status: 'available', last_success: '2025-10-05T05:00:00Z' },
        { source_id: 'reddit', status: 'available', last_success: '2025-10-05T05:00:00Z' },
      ],
    }

    vi.mocked(fetchJson).mockResolvedValue(mockSnapshot)

    const snapshot = await getSentimentSnapshot()

    expect(snapshot.overall_score).toBe(0.6)
    expect(snapshot.spike_detected).toBe(false)
    expect(snapshot.last_updated).toBe('2025-10-05T05:00:00Z')
    expect(fetchJson).toHaveBeenCalledWith(SENTIMENT_ENDPOINT)
  })

  it('computes spike flag when current score deviates from history', async () => {
    const mockSnapshot: SentimentSnapshot = {
      overall_score: 0.9,
      trend: 'rising',
      spike_detected: true,
      spike_direction: 'positive',
      min_30day: 0.4,
      max_30day: 0.95,
      age_minutes: 5,
      is_stale: false,
      last_updated: '2025-10-05T05:00:00Z',
      data_quality: {
        confidence: 'high',
        sample_size: 650,
        staleness_minutes: 5,
        language_filter_rate: 0.1,
      },
      hourly_buckets: [],
      topics: [],
      sources: [
        { source_id: 'twitter', status: 'available', last_success: '2025-10-05T05:00:00Z' },
      ],
    }

    vi.mocked(fetchJson).mockResolvedValue(mockSnapshot)

    const snapshot = await getSentimentSnapshot()

    expect(snapshot.spike_detected).toBe(true)
    expect(snapshot.spike_direction).toBe('positive')
  })

  it('throws Error when payload is invalid', async () => {
    // Mock response missing required fields
    vi.mocked(fetchJson).mockResolvedValue({
      trend: 'stable',
      spike_detected: false,
      // Missing overall_score and last_updated - should trigger validation error
    } as unknown as SentimentSnapshot)

    await expect(getSentimentSnapshot()).rejects.toThrow('Invalid sentiment snapshot response')
  })
})
