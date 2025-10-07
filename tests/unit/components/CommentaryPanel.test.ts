import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CommentaryPanel from '../../../src/components/sentiment/CommentaryPanel.vue'
import type { Commentary } from '../../../src/utils/types'

describe('CommentaryPanel', () => {
  function buildCommentary(partial: Partial<Commentary> = {}): Commentary {
    return {
      text: 'AI-generated summary about the health insurance buzz.',
      createdAt: '2025-10-05T12:00:00Z',
      includesTopics: ['Eigen risico'],
      sentimentLabel: 'Mixed',
      status: 'success',
      lengthChars: 72,
      ...partial,
    }
  }

  it('renders commentary text with AI tag when available', () => {
    const wrapper = mount(CommentaryPanel, {
      props: { commentary: buildCommentary() },
    })

    expect(wrapper.find('[data-test="commentary-tag"]').text()).toContain('AI Generated')
    expect(wrapper.find('[data-test="commentary-text"]').text()).toContain('health insurance buzz')
  })

  it('shows fallback message when commentary missing or failed', () => {
    const wrapper = mount(CommentaryPanel, {
      props: { commentary: buildCommentary({ status: 'fallback', text: null }) },
    })

    expect(wrapper.find('[data-test="commentary-empty"]').text()).toContain('Mood summary unavailable')
  })
})
