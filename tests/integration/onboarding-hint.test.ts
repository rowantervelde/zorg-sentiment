import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { ONBOARDING_STORAGE_KEY } from '../../src/composables/useOnboardingHint'
import { renderDashboard } from './utils/dashboard'

describe('Integration: Onboarding hint dismissal', () => {
  it('persists dismissal flag in local storage and hides the hint', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-10-08T10:30:00.000Z'))

    window.localStorage.clear()

    const { wrapper } = await renderDashboard()

  const hintSection = wrapper.get('[aria-label="Onboarding hint"]')
  expect(hintSection.element).toBeTruthy()

    await wrapper.get('[data-test="onboarding-dismiss"]').trigger('click')
    await nextTick()

    expect(window.localStorage.getItem(ONBOARDING_STORAGE_KEY)).not.toBeNull()
    expect(wrapper.findAll('[aria-label="Onboarding hint"]').length).toBe(0)

    wrapper.unmount()
  })
})
