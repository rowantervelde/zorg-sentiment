import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { useCommentary, COMMENTARY_FALLBACK_TEXT } from '../../../src/composables/useCommentary'
import type { Commentary } from '../../../src/utils/types'

vi.mock('../../../src/services/commentary-service', () => ({
  getCommentary: vi.fn(),
}))

const { getCommentary } = await import('../../../src/services/commentary-service')

async function flushAsync() {
  await Promise.resolve()
  await nextTick()
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('useCommentary', () => {
  it('retrieves commentary immediately and exposes display text', async () => {
    const commentary: Commentary = {
      text: 'Mood is Mixed edging Upbeat; premie keeps buzzing.',
      createdAt: '2025-10-05T04:55:00Z',
      includesTopics: ['premie'],
      sentimentLabel: 'Mixed',
      status: 'success',
      lengthChars: 62,
    }

    vi.mocked(getCommentary).mockResolvedValue(commentary)

    const { commentary: commentaryRef, displayText, loading, error } = useCommentary()

    expect(loading.value).toBe(true)

    await flushAsync()

    expect(commentaryRef.value).toEqual(commentary)
    expect(displayText.value).toBe(commentary.text)
    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
  })

  it('provides fallback display text when service returns fallback status', async () => {
    vi.mocked(getCommentary).mockResolvedValue({
      text: null,
      createdAt: null,
      includesTopics: [],
      sentimentLabel: null,
      status: 'fallback',
      lengthChars: 0,
    })

    const { displayText, commentary: commentaryRef } = useCommentary()

    await flushAsync()

    expect(displayText.value).toBe(COMMENTARY_FALLBACK_TEXT)
    expect(commentaryRef.value.status).toBe('fallback')
  })

  it('stores errors and applies fallback commentary when fetch fails', async () => {
    const error = new Error('commentary offline')
    vi.mocked(getCommentary).mockRejectedValue(error)

    const { refresh, error: errorRef, commentary: commentaryRef, loading } = useCommentary({ immediate: false })

    expect(loading.value).toBe(false)

    await refresh()

    expect(errorRef.value).toBe(error)
    expect(commentaryRef.value.status).toBe('fallback')
    expect(commentaryRef.value.text).toBeNull()
    expect(loading.value).toBe(false)
  })

  it('supports overriding request options', async () => {
    vi.mocked(getCommentary).mockResolvedValue({
      text: null,
      createdAt: null,
      includesTopics: [],
      sentimentLabel: null,
      status: 'fallback',
      lengthChars: 0,
    })

    const { refresh } = useCommentary({ immediate: false, request: { headers: { 'x-commentary': 'base' } } })

    await refresh({ timeoutMs: 1500 })

    expect(getCommentary).toHaveBeenCalledWith({ timeoutMs: 1500 })
  })
})
