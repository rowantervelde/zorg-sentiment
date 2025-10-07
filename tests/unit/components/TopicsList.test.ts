import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TopicsList from '../../../src/components/topics/TopicsList.vue'
import type { Topic } from '../../../src/utils/types'

describe('TopicsList', () => {
  function buildTopic(partial: Partial<Topic> = {}): Topic {
    return {
      name: 'Eigen risico',
      currentMentions3h: 120,
      prevMentions3h: 40,
      growthPercent: 200,
      positivePct: 42,
      neutralPct: 28,
      negativePct: 30,
      netPolarity: 12,
      polarizingFlag: false,
      firstSeen: '2025-10-04T12:00:00Z',
      lastSeen: '2025-10-05T12:00:00Z',
      ...partial,
    }
  }

  it('renders top topics with growth and polarity details', () => {
    const topics = [
      buildTopic({ name: 'Eigen risico', growthPercent: 180, netPolarity: 10 }),
      buildTopic({ name: 'Zorgpremie', currentMentions3h: 90, growthPercent: 120, positivePct: 30, negativePct: 50, polarizingFlag: true }),
    ]

    const wrapper = mount(TopicsList, {
      props: { topics },
    })

    const items = wrapper.findAll('[data-test="topic-item"]')
    expect(items).toHaveLength(2)
    expect(items[0].text()).toContain('Eigen risico')
    expect(items[0].text()).toContain('180%')
    expect(items[0].text()).toContain('12')

    const polarizingBadge = wrapper.find('[data-test="topic-polarizing"]')
    expect(polarizingBadge.exists()).toBe(true)
    expect(polarizingBadge.text()).toContain('Polarising')
  })

  it('shows friendly placeholder when no topics available', () => {
    const wrapper = mount(TopicsList, {
      props: { topics: [] },
    })

    expect(wrapper.find('[data-test="topic-empty"]').exists()).toBe(true)
  })
})
