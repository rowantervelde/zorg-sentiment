export const DEFAULT_TIMEOUT_MS = 8000

export interface FetchJsonOptions extends RequestInit {
  timeoutMs?: number
}

export interface ApiErrorOptions {
  endpoint: string
  status: number
  retryable: boolean
  message: string
  cause?: unknown
}

export class ApiError extends Error {
  status: number
  endpoint: string
  retryable: boolean
  cause: unknown

  constructor({ endpoint, status, retryable, message, cause }: ApiErrorOptions) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.endpoint = endpoint
    this.retryable = retryable
    this.cause = cause
  }
}

function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException) {
    return error.name === 'AbortError'
  }

  return error instanceof Error && error.name === 'AbortError'
}

function isRetryableStatus(status: number): boolean {
  if (status === 408 || status === 429) {
    return true
  }

  if (status >= 500 && status <= 599) {
    return true
  }

  return false
}

async function extractErrorMessage(response: Response): Promise<string> {
  let message = response.statusText || `Request failed with status ${response.status}`
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    try {
      const data = await response.json()
      if (typeof data === 'string') {
        message = data
      } else if (data && typeof data === 'object' && 'message' in data) {
        const candidate = (data as { message?: unknown }).message
        if (typeof candidate === 'string') {
          message = candidate
        }
      } else if (data) {
        message = JSON.stringify(data)
      }
    } catch {
      // fall back to default message
    }
  } else {
    try {
      const text = await response.text()
      if (text) {
        message = text
      }
    } catch {
      // fall back to default message
    }
  }

  return message
}

function mergeSignal(source: AbortSignal | null | undefined, target: AbortController): void {
  if (!source) {
    return
  }

  if (source.aborted) {
    target.abort()
    return
  }

  const abortHandler = () => {
    target.abort()
  }

  source.addEventListener('abort', abortHandler, { once: true })
}

export async function fetchJson<T>(endpoint: string, options: FetchJsonOptions = {}): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal, ...init } = options
  const controller = new AbortController()
  mergeSignal(signal, controller)

  const timeout = setTimeout(() => {
    controller.abort()
  }, timeoutMs)

  try {
    const response = await fetch(endpoint, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init.headers ?? {}),
      },
    })

    if (!response.ok) {
      const message = await extractErrorMessage(response)
      throw new ApiError({
        endpoint,
        status: response.status,
        retryable: isRetryableStatus(response.status),
        message,
      })
    }

    if (response.status === 204) {
      return undefined as T
    }

    try {
      const data = (await response.json()) as T
      return data
    } catch (error) {
      throw new ApiError({
        endpoint,
        status: response.status,
        retryable: false,
        message: 'Failed to parse JSON response',
        cause: error,
      })
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    if (isAbortError(error)) {
      throw new ApiError({
        endpoint,
        status: 408,
        retryable: true,
        message: `Request timed out after ${timeoutMs}ms`,
        cause: error,
      })
    }

    if (error instanceof Error) {
      throw new ApiError({
        endpoint,
        status: 0,
        retryable: true,
        message: error.message,
        cause: error,
      })
    }

    throw new ApiError({
      endpoint,
      status: 0,
      retryable: true,
      message: 'Unknown network error',
      cause: error,
    })
  } finally {
    clearTimeout(timeout)
  }
}
