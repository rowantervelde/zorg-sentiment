import { describe, expect, it, vi } from 'vitest'
import { renderDashboard } from './utils/dashboard'

describe('Integration: Spike detection marker', () => {
  it('annotates accessibility summary when spike flag is true', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-10-08T10:30:00.000Z'))

    const { wrapper } = await renderDashboard({
      snapshot: {
        compositeScore: 88,
        prior12hScores: [60, 62, 63, 64, 65, 65.5, 66, 66.5, 67, 67.5, 68, 68.5],
        spikeFlag: true,
      },
    })

    expect(wrapper.text()).toContain('Spike detected compared to previous trend')

    wrapper.unmount()
  })
})
