import { describe, expect, it, vi } from 'vitest'
import { renderDashboard } from './utils/dashboard'

describe('Integration: Dashboard load', () => {
  it('renders sentiment score, trend items, topics, and commentary content after refresh', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-10-08T10:30:00.000Z'))

    const { wrapper } = await renderDashboard()

    expect(wrapper.get('[data-test="score-value"]').text()).toBe('72')
    expect(wrapper.get('[data-test="score-label"]').text()).toBe('Upbeat')
    expect(wrapper.get('[data-test="commentary-text"]').text()).toContain('Upbeat vibe')

    const topics = wrapper.findAll('[data-test="topic-item"]')
    expect(topics).toHaveLength(2)
    expect(topics[0].text()).toContain('Premium relief pilot')

    const trendCards = wrapper.findAll('[data-test="trend-item"]')
    expect(trendCards.length).toBeGreaterThan(0)

    expect(wrapper.get('[data-test="freshness-timestamp"]').text()).not.toContain('unavailable')

    expect(wrapper.findAll('[aria-label="Onboarding hint"]').length).toBe(1)

    wrapper.unmount()
  })
})
