import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SentimentScore from '../../../src/components/sentiment/SentimentScore.vue'
import type { SentimentSnapshot } from '../../../src/utils/types'

describe('SentimentScore', () => {
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
      prior12hScores: [60, 61, 62, 63, 64, 65, 64, 63, 62, 61, 60, 59],
      spikeFlag: false,
      ...partial,
    }
  }

  it('renders score value, sentiment label, and tooltip info', () => {
    const snapshot = buildSnapshot({ compositeScore: 72 })

    const wrapper = mount(SentimentScore, {
      props: {
        snapshot,
      },
    })

    expect(wrapper.find('[data-test="score-value"]').text()).toBe('72')
    expect(wrapper.find('[data-test="score-label"]').text()).toContain('Upbeat')

    const tooltip = wrapper.find('[data-test="score-tooltip"]')
    expect(tooltip.attributes('title')).toContain('Aggregated normalized sentiment of recent public discussions')
  })

  it('displays trend direction and delta compared to previous hour', () => {
    const snapshot = buildSnapshot({ compositeScore: 55, prior12hScores: [40, 42, 44, 45, 46, 47, 48, 49, 50, 51, 52, 50] })

    const wrapper = mount(SentimentScore, {
      props: {
        snapshot,
      },
    })

    expect(wrapper.find('[data-test="score-trend"]').text()).toContain('↑')
    expect(wrapper.find('[data-test="score-trend"]').text()).toContain('+5.0')
  })
})
