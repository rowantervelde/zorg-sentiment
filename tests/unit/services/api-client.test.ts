import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, DEFAULT_TIMEOUT_MS, fetchJson } from '../../../src/services/api-client'

const stubFetch = (impl: Parameters<typeof vi.fn>[0]) => {
  const fetchSpy = vi.fn(impl)
  vi.stubGlobal('fetch', fetchSpy)
  return fetchSpy
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('fetchJson', () => {
  it('returns parsed JSON from successful responses', async () => {
    const payload = { hello: 'world' }

    const fetchSpy = stubFetch(async () =>
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const result = await fetchJson<typeof payload>('https://api.test/snapshot')

    expect(result).toEqual(payload)
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.test/snapshot',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('throws ApiError with normalized message for HTTP failures', async () => {
    const fetchSpy = stubFetch(async () =>
      new Response(JSON.stringify({ message: 'Service unavailable' }), {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' },
      }),
    )

  const error = await fetchJson('https://api.test/snapshot').catch((err: unknown) => err as ApiError)

    expect(fetchSpy).toHaveBeenCalled()
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(503)
    expect(error.retryable).toBe(true)
    expect(error.message).toContain('Service unavailable')
    expect(error.endpoint).toBe('https://api.test/snapshot')
  })

  it('wraps network failures in ApiError', async () => {
    const networkError = new TypeError('network down')
    stubFetch(async () => {
      throw networkError
    })

  const error = await fetchJson('https://api.test/snapshot').catch((err: unknown) => err as ApiError)

    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(0)
    expect(error.retryable).toBe(true)
    expect(error.cause).toBe(networkError)
  })

  it('aborts requests that exceed timeout', async () => {
    vi.useFakeTimers()

    const fetchSpy = stubFetch(async (_endpoint, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          'abort',
          () => {
            reject(new DOMException('Aborted', 'AbortError'))
          },
          { once: true },
        )
      }),
    )

  const promise = fetchJson('https://api.test/slow', { timeoutMs: 25 })
  const handled = promise.catch((err: unknown) => err as ApiError)

  await vi.advanceTimersByTimeAsync(25)

  const error = await handled

    expect(fetchSpy).toHaveBeenCalled()
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(408)
    expect(error.retryable).toBe(true)
    expect(error.message).toContain('timed out')
  })

  it('defaults to configured timeout when none provided', async () => {
    vi.useFakeTimers()

    const fetchSpy = stubFetch(async (_endpoint, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          'abort',
          () => reject(new DOMException('Aborted', 'AbortError')),
          { once: true },
        )
      }),
    )

  const promise = fetchJson('https://api.test/slow-default')
  const handled = promise.catch((err: unknown) => err as ApiError)

  await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 1)

  const error = await handled

    expect(fetchSpy).toHaveBeenCalled()
    expect(error.status).toBe(408)
  })
})
