import { computed, ref } from 'vue'
import { getTrendingTopics } from '../services/topics-service'
import type { FetchJsonOptions } from '../services/api-client'
import type { Topic } from '../utils/types'

import type { ComputedRef, Ref } from 'vue'

export interface UseTopicsOptions {
  immediate?: boolean
  request?: FetchJsonOptions
}

export interface UseTopicsReturn {
  topics: Ref<Topic[]>
  polarizingTopics: ComputedRef<Topic[]>
  nonPolarizingTopics: ComputedRef<Topic[]>
  loading: Ref<boolean>
  error: Ref<Error | null>
  refresh: (requestOverride?: FetchJsonOptions) => Promise<void>
}

function normaliseName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function containsAsWholeWord(container: string, term: string): boolean {
  if (!term) {
    return false
  }

  const pattern = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'i')
  return pattern.test(container)
}

function levenshtein(a: string, b: string): number {
  if (a === b) {
    return 0
  }

  const aLength = a.length
  const bLength = b.length

  if (aLength === 0) {
    return bLength
  }

  if (bLength === 0) {
    return aLength
  }

  const matrix: number[][] = Array.from({ length: aLength + 1 }, () => new Array(bLength + 1).fill(0))

  for (let i = 0; i <= aLength; i += 1) {
    matrix[i][0] = i
  }

  for (let j = 0; j <= bLength; j += 1) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= aLength; i += 1) {
    for (let j = 1; j <= bLength; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1

      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      )
    }
  }

  return matrix[aLength][bLength]
}

function isDuplicateTopic(candidate: Topic, existing: Topic): boolean {
  const candidateName = normaliseName(candidate.name)
  const existingName = normaliseName(existing.name)

  if (candidateName === existingName) {
    return true
  }

  if (containsAsWholeWord(candidateName, existingName) || containsAsWholeWord(existingName, candidateName)) {
    return true
  }

  return levenshtein(candidateName, existingName) <= 2
}

function deduplicateTopics(topics: Topic[]): Topic[] {
  const unique: Topic[] = []

  for (const topic of topics) {
    const duplicateIndex = unique.findIndex((existing) => isDuplicateTopic(topic, existing))

    if (duplicateIndex === -1) {
      unique.push(topic)
      continue
    }

    const existing = unique[duplicateIndex]
    if (topic.currentMentions3h > existing.currentMentions3h) {
      unique[duplicateIndex] = topic
    }
  }

  return unique
}

function normaliseError(error: unknown): Error {
  if (error instanceof Error) {
    return error
  }

  return new Error('Unknown error fetching topics')
}

export function useTopics(options: UseTopicsOptions = {}): UseTopicsReturn {
  const topicsRef = ref<Topic[]>([])
  const loadingRef = ref(false)
  const errorRef = ref<Error | null>(null)

  async function refresh(requestOverride?: FetchJsonOptions): Promise<void> {
    loadingRef.value = true
    errorRef.value = null

    try {
      const topics = await getTrendingTopics(requestOverride ?? options.request)
      topicsRef.value = deduplicateTopics(topics)
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

  const polarizingTopics = computed(() => topicsRef.value.filter((topic) => topic.polarizingFlag))
  const nonPolarizingTopics = computed(() => topicsRef.value.filter((topic) => !topic.polarizingFlag))

  return {
    topics: topicsRef,
    polarizingTopics,
    nonPolarizingTopics,
    loading: loadingRef,
    error: errorRef,
    refresh,
  }
}
