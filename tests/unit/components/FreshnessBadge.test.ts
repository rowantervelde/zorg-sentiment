import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import FreshnessBadge from '../../../src/components/shared/FreshnessBadge.vue'
import type { RefreshMetadata } from '../../../src/utils/types'

describe('FreshnessBadge', () => {
  function buildRefresh(partial: Partial<RefreshMetadata> = {}): RefreshMetadata {
    return {
      lastRefreshAt: '2025-10-05T14:20:00Z',
      ageMinutes: 12,
      partialFlags: [],
      staleFlag: false,
      ...partial,
    }
  }

  it('renders formatted timestamp and age when data is fresh', () => {
    const wrapper = mount(FreshnessBadge, {
      props: { refresh: buildRefresh() },
    })

    const timestamp = wrapper.find('[data-test="freshness-timestamp"]').text()
  expect(timestamp).toContain('16:20')
    expect(timestamp).toContain('12m ago')
    expect(wrapper.attributes('data-state')).toBe('fresh')
  })

  it('marks state as stale when flag provided', () => {
    const wrapper = mount(FreshnessBadge, {
      props: { 
        ageMinutes: 45, 
        isStale: true,
        lastUpdated: '2025-10-18T12:00:00Z'
      },
    })

    expect(wrapper.attributes('data-state')).toBe('stale')
    expect(wrapper.text()).toContain('Stale')
  })
})
