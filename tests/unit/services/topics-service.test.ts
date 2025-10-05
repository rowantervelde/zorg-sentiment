import { afterEach, describe, expect, it, vi } from 'vitest'
import { getTrendingTopics, TOPICS_ENDPOINT } from '../../../src/services/topics-service'
import { ApiError } from '../../../src/services/api-client'
import type { Topic } from '../../../src/utils/types'

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

describe('getTrendingTopics', () => {
  it('maps feed response to sorted topics with derived fields', async () => {
    vi.mocked(fetchJson).mockResolvedValue({
      topics: [
        {
          name: 'premie',
          currentMentions3h: 100,
          prevMentions3h: 50,
          positivePct: 55,
          neutralPct: 25,
          negativePct: 20,
          firstSeen: '2025-09-30T10:00:00Z',
          lastSeen: '2025-10-05T04:55:00Z',
        },
        {
          name: 'dekking',
          currentMentions3h: 30,
          prevMentions3h: 10,
          positivePct: 30,
          neutralPct: 30,
          negativePct: 40,
          firstSeen: '2025-09-25T10:00:00Z',
          lastSeen: '2025-10-05T04:45:00Z',
        },
      ],
    })

    const topics = await getTrendingTopics()

    expect(topics).toEqual<Topic[]>([
      {
        name: 'dekking',
        currentMentions3h: 30,
        prevMentions3h: 10,
        growthPercent: 200,
        positivePct: 30,
        neutralPct: 30,
        negativePct: 40,
        netPolarity: -10,
        polarizingFlag: false,
        firstSeen: '2025-09-25T10:00:00Z',
        lastSeen: '2025-10-05T04:45:00Z',
      },
      {
        name: 'premie',
        currentMentions3h: 100,
        prevMentions3h: 50,
        growthPercent: 100,
        positivePct: 55,
        neutralPct: 25,
        negativePct: 20,
        netPolarity: 35,
        polarizingFlag: false,
        firstSeen: '2025-09-30T10:00:00Z',
        lastSeen: '2025-10-05T04:55:00Z',
      },
    ])

    expect(fetchJson).toHaveBeenCalledWith(TOPICS_ENDPOINT)
  })

  it('marks growthPercent null when previous window below threshold', async () => {
    vi.mocked(fetchJson).mockResolvedValue({
      topics: [
        {
          name: 'zorgtoeslag',
          currentMentions3h: 4,
          prevMentions3h: 2,
          positivePct: 40,
          neutralPct: 20,
          negativePct: 40,
          firstSeen: '2025-09-28T12:00:00Z',
          lastSeen: '2025-10-05T04:40:00Z',
        },
      ],
    })

    const topics = await getTrendingTopics()

    expect(topics[0].growthPercent).toBeNull()
  })

  it('flags polarizing topics when positive and negative both ≥35%', async () => {
    vi.mocked(fetchJson).mockResolvedValue({
      topics: [
        {
          name: 'eigen risico',
          currentMentions3h: 80,
          prevMentions3h: 60,
          positivePct: 40,
          neutralPct: 20,
          negativePct: 40,
          firstSeen: '2025-09-28T12:00:00Z',
          lastSeen: '2025-10-05T04:40:00Z',
        },
      ],
    })

    const topics = await getTrendingTopics()

    expect(topics[0].polarizingFlag).toBe(true)
  })

  it('throws ApiError when required fields missing or invalid', async () => {
    vi.mocked(fetchJson).mockResolvedValue({
      topics: [
        {
          name: '',
          currentMentions3h: -1,
          prevMentions3h: 0,
          positivePct: 10,
          neutralPct: 10,
          negativePct: 80,
          firstSeen: 'not-a-date',
          lastSeen: '2025-10-05T04:40:00Z',
        },
      ],
    })

    await expect(getTrendingTopics()).rejects.toBeInstanceOf(ApiError)
  })

  it('throws ApiError when percent totals fall outside tolerance', async () => {
    vi.mocked(fetchJson).mockResolvedValue({
      topics: [
        {
          name: 'premie',
          currentMentions3h: 100,
          prevMentions3h: 80,
          positivePct: 40,
          neutralPct: 20,
          negativePct: 45,
          firstSeen: '2025-09-30T10:00:00Z',
          lastSeen: '2025-10-05T04:55:00Z',
        },
      ],
    })

    await expect(getTrendingTopics()).rejects.toBeInstanceOf(ApiError)
  })
})
