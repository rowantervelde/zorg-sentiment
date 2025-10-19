import { mount } from '@vue/test-utils'
import { computed, nextTick, ref } from 'vue'
import { vi } from 'vitest'
import type { SentimentSnapshot } from '../../../src/types/sentiment'
import type { Commentary, Topic } from '../../../src/utils/types'

export interface DashboardRenderOptions {
  snapshot?: Partial<SentimentSnapshot>
  topics?: Topic[]
  commentary?: Partial<Commentary>
  topicsError?: Error | null
  commentaryError?: Error | null
}

const DEFAULT_SNAPSHOT: SentimentSnapshot = {
  overall_score: 0.44, // Maps to 72
  trend: 'stable',
  spike_detected: false,
  spike_direction: undefined,
  min_30day: 0.4,
  max_30day: 0.92,
  age_minutes: 30,
  is_stale: false,
  last_updated: '2025-10-08T10:00:00.000Z',
  data_quality: {
    confidence: 'high',
    sample_size: 750,
    staleness_minutes: 30,
    language_filter_rate: 0.1,
  },
  hourly_buckets: Array.from({ length: 24 }, (_, i) => ({
    bucket_id: `2025-10-08-${String(i).padStart(2, '0')}`,
    start_time: `2025-10-08T${String(i).padStart(2, '0')}:00:00.000Z`,
    end_time: `2025-10-08T${String(i + 1).padStart(2, '0')}:00:00.000Z`,
    posts: [],
    aggregate_score: 0.36 + (i * 0.01),
    post_count: 30 + i,
  })),
  topics: [],
  sources: [
    { source_id: 'twitter', status: 'available', last_success: '2025-10-08T10:00:00.000Z' },
    { source_id: 'reddit', status: 'available', last_success: '2025-10-08T10:00:00.000Z' },
  ],
}

const DEFAULT_TOPICS: Topic[] = [
  {
    name: 'Premium relief pilot',
    currentMentions3h: 128,
    prevMentions3h: 64,
    growthPercent: 100,
    positivePct: 48,
    neutralPct: 27,
    negativePct: 25,
    netPolarity: 23,
    polarizingFlag: false,
    firstSeen: '2025-10-08T07:30:00.000Z',
    lastSeen: '2025-10-08T09:55:00.000Z',
  },
  {
    name: 'Pharmacy wait times',
    currentMentions3h: 96,
    prevMentions3h: 48,
    growthPercent: 85,
    positivePct: 18,
    neutralPct: 33,
    negativePct: 49,
    netPolarity: -31,
    polarizingFlag: false,
    firstSeen: '2025-10-08T08:15:00.000Z',
    lastSeen: '2025-10-08T09:58:00.000Z',
  },
]

const DEFAULT_COMMENTARY: Commentary = {
  text: 'Upbeat vibe: citizens are cheering a relief pilot while keeping an eye on pharmacy wait times.',
  createdAt: '2025-10-08T10:00:00.000Z',
  includesTopics: ['Premium relief pilot', 'Pharmacy wait times'],
  sentimentLabel: 'Upbeat',
  status: 'success',
  lengthChars: 104,
}

export async function renderDashboard(options: DashboardRenderOptions = {}) {
  const snapshotData: SentimentSnapshot = { ...DEFAULT_SNAPSHOT, ...options.snapshot }
  const topicsData: Topic[] = options.topics ?? DEFAULT_TOPICS
  const commentaryData: Commentary = { ...DEFAULT_COMMENTARY, ...options.commentary }
  const topicError = options.topicsError ?? null
  const commentaryError = options.commentaryError ?? null

  const snapshotRef = ref<SentimentSnapshot | null>(null)
  const snapshotErrorRef = ref<Error | null>(null)

  const topicsRef = ref<Topic[]>([])
  const topicsErrorRef = ref<Error | null>(null)

  const commentaryRef = ref<Commentary>(commentaryError ? fallbackCommentary() : commentaryData)
  const commentaryErrorRef = ref<Error | null>(null)

  const sentimentRefresh = vi.fn(async () => {
    if (snapshotErrorRef.value) {
      snapshotErrorRef.value = null
    }
    snapshotRef.value = snapshotData
  })

  const topicsRefresh = vi.fn(async () => {
    if (topicError) {
      topicsErrorRef.value = topicError
      topicsRef.value = []
      throw topicError
    }
    topicsErrorRef.value = null
    topicsRef.value = topicsData
  })

  const commentaryRefresh = vi.fn(async () => {
    if (commentaryError) {
      commentaryErrorRef.value = commentaryError
      commentaryRef.value = fallbackCommentary()
      throw commentaryError
    }
    commentaryErrorRef.value = null
    commentaryRef.value = commentaryData
  })

  vi.doMock('../../../src/composables/useSentimentSnapshot', () => ({
    useSentimentSnapshot: () => ({
      snapshot: snapshotRef,
      loading: ref(false),
      error: snapshotErrorRef,
      hasSnapshot: computed(() => snapshotRef.value !== null),
      refresh: sentimentRefresh,
    }),
  }))

  vi.doMock('../../../src/composables/useTopics', () => ({
    useTopics: () => ({
      topics: topicsRef,
      polarizingTopics: computed(() => topicsRef.value.filter((topic) => topic.polarizingFlag)),
      nonPolarizingTopics: computed(() => topicsRef.value.filter((topic) => !topic.polarizingFlag)),
      loading: ref(false),
      error: topicsErrorRef,
      refresh: topicsRefresh,
    }),
  }))

  vi.doMock('../../../src/composables/useCommentary', () => ({
    useCommentary: () => ({
      commentary: commentaryRef,
      displayText: computed(() => commentaryRef.value.text ?? 'Mood summary unavailable — data still live.'),
      loading: ref(false),
      error: commentaryErrorRef,
      refresh: commentaryRefresh,
    }),
  }))

  const { default: App } = await import('../../../src/app.vue')
  const wrapper = mount(App, { attachTo: document.body })

  await flushPromises()

  return {
    wrapper,
    snapshotRef,
    topicsRef,
    commentaryRef,
    sentimentRefresh,
    topicsRefresh,
    commentaryRefresh,
    async refreshAgain() {
      await sentimentRefresh()
      await topicsRefresh()
      await commentaryRefresh()
      await flushPromises()
    },
  }
}

function fallbackCommentary(): Commentary {
  return {
    text: null,
    createdAt: null,
    includesTopics: [],
    sentimentLabel: null,
    status: 'fallback',
    lengthChars: 0,
  }
}

async function flushPromises() {
  await Promise.resolve()
  await nextTick()
  await Promise.resolve()
  await nextTick()
}
