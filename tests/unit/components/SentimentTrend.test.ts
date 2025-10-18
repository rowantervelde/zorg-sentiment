import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SentimentTrend from '../../../src/components/sentiment/SentimentTrend.vue'
import type { SentimentSnapshot } from '../../../src/utils/types'

describe('SentimentTrend', () => {
  function buildSnapshot(partial: Partial<SentimentSnapshot> = {}): SentimentSnapshot {
    return {
      windowStart: '2025-10-05T03:00:00Z',
      windowEnd: '2025-10-05T04:00:00Z',
      positiveCount: 120,
      neutralCount: 80,
      negativeCount: 40,
      compositeScore: 68,
      min30Day: 30,
      max30Day: 92,
      prior12hScores: [40, 42, 44, 43, 45, 46, 48, 50, 51, 52, 53, 55],
      spikeFlag: false,
      ...partial,
    }
  }

  it('renders textual fallback summary for prior hour scores', () => {
    const snapshot = buildSnapshot()
    const wrapper = mount(SentimentTrend, {
      props: { snapshot },
    })

    const items = wrapper.findAll('[data-test="trend-item"]')
    expect(items).toHaveLength(12)
  expect(wrapper.find('[data-test="trend-range"]').text()).toContain('05:00')
    expect(wrapper.text()).toContain('Trend insights')
  })

  it('shows placeholder when insufficient data provided', () => {
    const snapshot = buildSnapshot({ prior12hScores: [] })
    const wrapper = mount(SentimentTrend, {
      props: { snapshot },
    })

    expect(wrapper.find('[data-test="trend-empty"]').exists()).toBe(true)
  })
})
