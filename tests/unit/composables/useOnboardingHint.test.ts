import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useOnboardingHint, ONBOARDING_STORAGE_KEY, ONBOARDING_EXPIRY_DAYS } from '../../../src/composables/useOnboardingHint'

function advanceDays(days: number) {
  vi.setSystemTime(Date.now() + days * 24 * 60 * 60 * 1000)
}

describe('useOnboardingHint', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-10-05T00:00:00Z'))
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows hint initially and persists dismissal', () => {
    const { isVisible, dismiss } = useOnboardingHint()

    expect(isVisible.value).toBe(true)

    dismiss()

    expect(isVisible.value).toBe(false)
    const stored = window.localStorage.getItem(ONBOARDING_STORAGE_KEY)
    expect(stored).not.toBeNull()
  })

  it('remains hidden when dismissal is still within expiry window', () => {
    window.localStorage.setItem(
      ONBOARDING_STORAGE_KEY,
      JSON.stringify({ status: 'dismissed', timestamp: new Date('2025-09-10T00:00:00Z').toISOString() }),
    )

    const { isVisible } = useOnboardingHint()

    expect(isVisible.value).toBe(false)
  })

  it('re-displays hint after expiry period', () => {
    const dismissedAt = new Date('2025-06-01T00:00:00Z').toISOString()
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({ status: 'dismissed', timestamp: dismissedAt }))

    const { isVisible, dismiss } = useOnboardingHint()

    expect(isVisible.value).toBe(true)

    dismiss()

    advanceDays(ONBOARDING_EXPIRY_DAYS + 1)

    const hint = useOnboardingHint()
    expect(hint.isVisible.value).toBe(true)
  })

  it('supports manual reset', () => {
    const { dismiss, reset, isVisible } = useOnboardingHint()

    dismiss()

    expect(isVisible.value).toBe(false)

    reset()

    expect(isVisible.value).toBe(true)
    expect(window.localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBeNull()
  })
})
