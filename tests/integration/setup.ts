import { afterEach, beforeEach, vi } from 'vitest'

beforeEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
  vi.resetModules()
})
