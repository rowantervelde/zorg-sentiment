import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { useSentimentSnapshot } from '../../../src/composables/useSentimentSnapshot'
import type { SentimentSnapshot } from '../../../src/utils/types'

vi.mock('../../../src/services/sentiment-service', () => ({
  getSentimentSnapshot: vi.fn(),
}))

const { getSentimentSnapshot } = await import('../../../src/services/sentiment-service')

async function flushAsync() {
  await Promise.resolve()
  await nextTick()
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('useSentimentSnapshot', () => {
  it('fetches snapshot immediately by default', async () => {
    const snapshot: SentimentSnapshot = {
      windowStart: '2025-10-05T03:00:00Z',
      windowEnd: '2025-10-05T04:00:00Z',
      positiveCount: 100,
      neutralCount: 60,
      negativeCount: 40,
      compositeScore: 65,
      min30Day: 30,
      max30Day: 90,
      prior12hScores: [50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61],
      spikeFlag: false,
    }

    vi.mocked(getSentimentSnapshot).mockResolvedValue(snapshot)

    const { snapshot: snapshotRef, loading, error } = useSentimentSnapshot()

    expect(loading.value).toBe(true)

    await flushAsync()

    expect(snapshotRef.value).toEqual(snapshot)
    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('allows manual refresh and handles errors', async () => {
    const error = new Error('network broke')
    vi.mocked(getSentimentSnapshot).mockRejectedValue(error)

    const { refresh, error: errorRef, loading } = useSentimentSnapshot({ immediate: false })

    expect(loading.value).toBe(false)

    await expect(refresh()).rejects.toBe(error)

    expect(errorRef.value).toBe(error)
    expect(loading.value).toBe(false)
  })

  it('passes through request overrides', async () => {
    const snapshot: SentimentSnapshot = {
      windowStart: '2025-10-05T03:00:00Z',
      windowEnd: '2025-10-05T04:00:00Z',
      positiveCount: 100,
      neutralCount: 60,
      negativeCount: 40,
      compositeScore: 65,
      min30Day: 30,
      max30Day: 90,
      prior12hScores: [50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61],
      spikeFlag: false,
    }

    vi.mocked(getSentimentSnapshot).mockResolvedValue(snapshot)

    const { refresh } = useSentimentSnapshot({ immediate: false, request: { headers: { 'x-base': '1' } } })

    await refresh({ timeoutMs: 1000 })

    expect(getSentimentSnapshot).toHaveBeenCalledWith({ timeoutMs: 1000 })
  })

  it('exposes hasSnapshot computed flag', async () => {
    const snapshot: SentimentSnapshot = {
      windowStart: '2025-10-05T03:00:00Z',
      windowEnd: '2025-10-05T04:00:00Z',
      positiveCount: 100,
      neutralCount: 60,
      negativeCount: 40,
      compositeScore: 65,
      min30Day: 30,
      max30Day: 90,
      prior12hScores: [50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61],
      spikeFlag: false,
    }

    vi.mocked(getSentimentSnapshot).mockResolvedValue(snapshot)

    const { hasSnapshot } = useSentimentSnapshot()

    expect(hasSnapshot.value).toBe(false)

    await flushAsync()

    expect(hasSnapshot.value).toBe(true)
  })
})
