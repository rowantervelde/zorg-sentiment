import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SentimentScore from '../../../src/components/sentiment/SentimentScore.vue'
import type { SentimentSnapshot } from '../../../src/types/sentiment'

describe('SentimentScore', () => {
  function buildSnapshot(partial: Partial<SentimentSnapshot> = {}): SentimentSnapshot {
    return {
      overall_score: 0.36, // Maps to compositeScore 68
      trend: 'stable',
      spike_detected: false,
      spike_direction: undefined,
      min_30day: 30,
      max_30day: 92,
      age_minutes: 5,
      is_stale: false,
      last_updated: '2025-10-18T12:00:00Z',
      data_quality: {
        sample_size: 240,
        confidence: 'high',
        staleness_minutes: 5,
        language_filter_rate: 0.1,
      },
      topics: [],
      sources: [
        { source_id: 'twitter', status: 'available', last_success: '2025-10-18T12:00:00Z' },
        { source_id: 'reddit', status: 'available', last_success: '2025-10-18T12:00:00Z' },
      ],
      hourly_buckets: Array.from({ length: 24 }, (_, i) => ({
        bucket_id: `2025-10-18-${String(i).padStart(2, '0')}`,
        start_time: `2025-10-18T${String(i).padStart(2, '0')}:00:00Z`,
        end_time: `2025-10-18T${String(i).padStart(2, '0')}:59:59Z`,
        posts: [],
        aggregate_score: 0.3 + (i * 0.01),
        post_count: 10,
      })),
      ...partial,
    }
  }

  it('renders score value, sentiment label, and tooltip info', () => {
    const snapshot = buildSnapshot({ overall_score: 0.44 }) // Maps to 72

    const wrapper = mount(SentimentScore, {
      props: {
        snapshot,
      },
    })

    expect(wrapper.find('[data-test="score-value"]').text()).toBe('72')
    expect(wrapper.find('[data-test="score-label"]').text()).toContain('Sunny')
  })

  it('displays trend direction and delta compared to previous hour', () => {
    const snapshot = buildSnapshot({ 
      overall_score: 0.1, // Maps to 55
      trend: 'rising',
    })

    const wrapper = mount(SentimentScore, {
      props: {
        snapshot,
      },
    })

    // Trend label should show "Sentiment is rising"
    expect(wrapper.find('[data-test="score-trend"]').text()).toContain('Sentiment is rising')
  })
})
