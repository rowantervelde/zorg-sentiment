import { computed, ref } from 'vue'
import { getCommentary } from '../services/commentary-service'
import type { FetchJsonOptions } from '../services/api-client'
import type { Commentary } from '../utils/types'

import type { ComputedRef, Ref } from 'vue'

export const COMMENTARY_FALLBACK_TEXT = 'Mood summary unavailable — data still live.'

export interface UseCommentaryOptions {
  immediate?: boolean
  request?: FetchJsonOptions
}

export interface UseCommentaryReturn {
  commentary: Ref<Commentary>
  displayText: ComputedRef<string>
  loading: Ref<boolean>
  error: Ref<Error | null>
  refresh: (requestOverride?: FetchJsonOptions) => Promise<void>
}

function createFallbackCommentary(): Commentary {
  return {
    text: null,
    createdAt: null,
    includesTopics: [],
    sentimentLabel: null,
    status: 'fallback',
    lengthChars: 0,
  }
}

function normaliseError(error: unknown): Error {
  if (error instanceof Error) {
    return error
  }

  return new Error('Unknown error fetching commentary')
}

export function useCommentary(options: UseCommentaryOptions = {}): UseCommentaryReturn {
  const commentaryRef = ref<Commentary>(createFallbackCommentary())
  const loadingRef = ref(false)
  const errorRef = ref<Error | null>(null)

  async function refresh(requestOverride?: FetchJsonOptions): Promise<void> {
    if (loadingRef.value) {
      return
    }

    loadingRef.value = true
    errorRef.value = null

    try {
      const commentary = await getCommentary(requestOverride ?? options.request)
      commentaryRef.value = commentary
    } catch (error) {
      const normalised = normaliseError(error)
      errorRef.value = normalised
      commentaryRef.value = createFallbackCommentary()
    } finally {
      loadingRef.value = false
    }
  }

  if (options.immediate !== false) {
    void refresh()
  }

  const displayText = computed(() => commentaryRef.value.text ?? COMMENTARY_FALLBACK_TEXT)

  return {
    commentary: commentaryRef,
    displayText,
    loading: loadingRef,
    error: errorRef,
    refresh,
  }
}
