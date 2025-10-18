import { describe, expect, it, vi } from 'vitest'
import { renderDashboard } from './utils/dashboard'

describe('Integration: Stale indicator', () => {
  it('flags stale data when the latest refresh exceeds the threshold', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-10-08T10:30:00.000Z'))

    const twoHoursAgo = '2025-10-08T08:30:00.000Z'
    const { wrapper } = await renderDashboard({
      snapshot: {
        windowStart: '2025-10-08T07:30:00.000Z',
        windowEnd: twoHoursAgo,
      },
      commentary: {
        createdAt: '2025-10-08T08:10:00.000Z',
      },
    })

  const timestamp = wrapper.get('[data-test="freshness-timestamp"]')
  expect(timestamp.text()).toContain('ago')

    const container = timestamp.element.closest('[data-state]') as HTMLElement | null
    expect(container?.dataset.state).toBe('stale')
    expect(wrapper.text()).toContain('Data may be stale')

    wrapper.unmount()
  })
})
