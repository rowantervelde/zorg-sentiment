import { computed, ref } from 'vue'
import { getSentimentSnapshot } from '../services/sentiment-service'
import type { FetchJsonOptions } from '../services/api-client'
import type { SentimentSnapshot } from '../utils/types'

import type { ComputedRef, Ref } from 'vue'

export interface UseSentimentSnapshotOptions {
  immediate?: boolean
  request?: FetchJsonOptions
}

export interface UseSentimentSnapshotReturn {
  snapshot: Readonly<Ref<SentimentSnapshot | null>>
  loading: Readonly<Ref<boolean>>
  error: Readonly<Ref<Error | null>>
  hasSnapshot: ComputedRef<boolean>
  refresh: (requestOverride?: FetchJsonOptions) => Promise<void>
}

function normaliseError(error: unknown): Error {
  if (error instanceof Error) {
    return error
  }

  return new Error('Unknown error fetching sentiment snapshot')
}

export function useSentimentSnapshot(options: UseSentimentSnapshotOptions = {}): UseSentimentSnapshotReturn {
  const snapshotRef = ref<SentimentSnapshot | null>(null)
  const loadingRef = ref(false)
  const errorRef = ref<Error | null>(null)

  async function refresh(requestOverride?: FetchJsonOptions): Promise<void> {
    loadingRef.value = true
    errorRef.value = null

    try {
      const snapshot = await getSentimentSnapshot(requestOverride ?? options.request)
      snapshotRef.value = snapshot
    } catch (error) {
      const normalised = normaliseError(error)
      errorRef.value = normalised
      throw normalised
    } finally {
      loadingRef.value = false
    }
  }

  if (options.immediate !== false) {
    void refresh()
  }

  const snapshot = snapshotRef
  const loading = loadingRef
  const error = errorRef
  const hasSnapshot = computed(() => snapshotRef.value !== null)

  return {
    snapshot,
    loading,
    error,
    hasSnapshot,
    refresh,
  }
}
