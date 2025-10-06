import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { useTopics } from '../../../src/composables/useTopics'
import type { Topic } from '../../../src/utils/types'

vi.mock('../../../src/services/topics-service', () => ({
  getTrendingTopics: vi.fn(),
}))

const { getTrendingTopics } = await import('../../../src/services/topics-service')

async function flushAsync() {
  await Promise.resolve()
  await nextTick()
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('useTopics', () => {
  it('fetches topics and deduplicates similar names by keeping highest volume', async () => {
    const topics: Topic[] = [
      {
        name: 'Premie',
        currentMentions3h: 120,
        prevMentions3h: 60,
        growthPercent: 100,
        positivePct: 40,
        neutralPct: 30,
        negativePct: 30,
        netPolarity: 10,
        polarizingFlag: false,
        firstSeen: '2025-10-05T00:00:00Z',
        lastSeen: '2025-10-05T04:00:00Z',
      },
      {
        name: 'premié',
        currentMentions3h: 90,
        prevMentions3h: 40,
        growthPercent: 125,
        positivePct: 42,
        neutralPct: 28,
        negativePct: 30,
        netPolarity: 12,
        polarizingFlag: false,
        firstSeen: '2025-10-05T00:30:00Z',
        lastSeen: '2025-10-05T04:00:00Z',
      },
      {
        name: 'dekking',
        currentMentions3h: 80,
        prevMentions3h: 20,
        growthPercent: 300,
        positivePct: 35,
        neutralPct: 25,
        negativePct: 40,
        netPolarity: -5,
        polarizingFlag: true,
        firstSeen: '2025-10-05T01:00:00Z',
        lastSeen: '2025-10-05T04:05:00Z',
      },
      {
        name: 'zorg premie',
        currentMentions3h: 70,
        prevMentions3h: 30,
        growthPercent: 133,
        positivePct: 45,
        neutralPct: 30,
        negativePct: 25,
        netPolarity: 20,
        polarizingFlag: false,
        firstSeen: '2025-10-05T01:30:00Z',
        lastSeen: '2025-10-05T04:05:00Z',
      },
    ]

    vi.mocked(getTrendingTopics).mockResolvedValue(topics)

    const { topics: topicsRef, polarizingTopics } = useTopics()

    expect(topicsRef.value.length).toBe(0)

    await flushAsync()

  expect(topicsRef.value.map((topic: Topic) => topic.name)).toEqual(['Premie', 'dekking'])
  expect(polarizingTopics.value.map((topic: Topic) => topic.name)).toEqual(['dekking'])
  })

  it('allows manual refresh and stores errors', async () => {
    const error = new Error('topics down')
    vi.mocked(getTrendingTopics).mockRejectedValue(error)

    const { refresh, error: errorRef, loading } = useTopics({ immediate: false })

    expect(loading.value).toBe(false)

    await expect(refresh()).rejects.toBe(error)

    expect(errorRef.value).toBe(error)
    expect(loading.value).toBe(false)
  })

  it('supports overriding request options', async () => {
    vi.mocked(getTrendingTopics).mockResolvedValue([])

    const { refresh } = useTopics({ immediate: false, request: { headers: { 'x-topics': 'base' } } })

    await refresh({ timeoutMs: 2000 })

    expect(getTrendingTopics).toHaveBeenCalledWith({ timeoutMs: 2000 })
  })
})
