import { describe, expect, it, vi } from 'vitest'
import type { Topic } from '../../src/utils/types'
import { renderDashboard } from './utils/dashboard'

describe('Integration: Polarizing topic badge', () => {
  it('shows polarising badge when topics exceed polarity thresholds', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-10-08T10:30:00.000Z'))

    const polarisingTopic: Topic = {
      name: 'Hospital billing disputes',
      currentMentions3h: 150,
      prevMentions3h: 60,
      growthPercent: 150,
      positivePct: 35,
      neutralPct: 20,
      negativePct: 45,
      netPolarity: -10,
      polarizingFlag: true,
      firstSeen: '2025-10-08T07:00:00.000Z',
      lastSeen: '2025-10-08T10:10:00.000Z',
    }

    const { wrapper } = await renderDashboard({
      topics: [polarisingTopic],
    })

    const topicItems = wrapper.findAll('[data-test="topic-item"]')
    expect(topicItems).toHaveLength(1)
    expect(topicItems[0].text()).toContain('Hospital billing disputes')
    expect(wrapper.get('[data-test="topic-polarizing"]').text()).toContain('Polarising sentiment')

    wrapper.unmount()
  })
})
