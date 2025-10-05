import { afterEach, describe, expect, it, vi } from 'vitest'
import { getCommentary, COMMENTARY_ENDPOINT } from '../../../src/services/commentary-service'
import type { Commentary } from '../../../src/utils/types'

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

describe('getCommentary', () => {
  it('maps successful payload to commentary entity', async () => {
    const response = {
      status: 'success' as const,
      text: 'Mood is Mixed edging Upbeat; premie and dekking dominate chatter.',
      createdAt: '2025-10-05T04:55:00Z',
      sentimentLabel: 'Mixed',
      includesTopics: [' premIE ', 'dekking', 'ignored'],
    }

    vi.mocked(fetchJson).mockResolvedValue(response)

    const commentary = await getCommentary()

    expect(commentary).toEqual<Commentary>({
      text: response.text,
      createdAt: response.createdAt,
      sentimentLabel: 'Mixed',
      includesTopics: ['premIE', 'dekking'],
      status: 'success',
      lengthChars: response.text.length,
    })

    expect(fetchJson).toHaveBeenCalledWith(COMMENTARY_ENDPOINT)
  })

  it('handles fallback status by returning null text and empty topics', async () => {
    vi.mocked(fetchJson).mockResolvedValue({
      status: 'fallback' as const,
    })

    const commentary = await getCommentary()

    expect(commentary).toEqual<Commentary>({
      text: null,
      createdAt: null,
      sentimentLabel: null,
      includesTopics: [],
      status: 'fallback',
      lengthChars: 0,
    })
  })

  it('accepts stale status while validating fields', async () => {
    vi.mocked(fetchJson).mockResolvedValue({
      status: 'stale' as const,
      text: 'Last confirmed commentary from earlier cycle.',
      createdAt: '2025-10-05T03:40:00Z',
      sentimentLabel: 'Upbeat',
      includesTopics: [],
    })

    const commentary = await getCommentary()

    expect(commentary.status).toBe('stale')
    expect(commentary.text).toBeTruthy()
    expect(commentary.lengthChars).toBeGreaterThan(0)
  })

  it('throws ApiError when label or timestamps are invalid', async () => {
    vi.mocked(fetchJson).mockResolvedValue({
      status: 'success' as const,
      text: 'hello world',
      createdAt: 'not-a-date',
      sentimentLabel: 'Unknown',
      includesTopics: [],
    })

    await expect(getCommentary()).rejects.toBeInstanceOf(ApiError)
  })

  it('throws ApiError when text exceeds allowed length', async () => {
    const longText = 'a'.repeat(401)
    vi.mocked(fetchJson).mockResolvedValue({
      status: 'success' as const,
      text: longText,
      createdAt: '2025-10-05T04:55:00Z',
      sentimentLabel: 'Mixed',
      includesTopics: [],
    })

    await expect(getCommentary()).rejects.toBeInstanceOf(ApiError)
  })
})
