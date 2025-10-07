<template>
  <main class="min-h-screen bg-slate-50 pb-16 pt-10 text-slate-900">
    <div class="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 sm:px-6 lg:gap-8">
      <header class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 class="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Zorg-sentiment dashboard
          </h1>
          <p class="mt-2 max-w-2xl text-base text-slate-600">
            Real-time mood signals about Dutch healthcare insurance, blending data with a playful voice.
          </p>
        </div>
        <div class="flex flex-wrap items-center justify-end gap-3">
          <FreshnessBadge v-if="refreshMetadata" :refresh="refreshMetadata" />
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            :disabled="isRefreshing"
            data-test="refresh-button"
            @click="refreshAll"
          >
            <span v-if="isRefreshing" class="h-2 w-2 animate-pulse rounded-full bg-emerald-300" />
            <span>{{ isRefreshing ? 'Refreshing…' : 'Refresh now' }}</span>
          </button>
        </div>
      </header>

      <section
        v-if="onboardingHintVisible"
        class="rounded-xl border border-dashed border-slate-300 bg-white/80 p-4 text-left shadow-sm"
      >
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-base font-semibold text-slate-900">Quick tour</h2>
            <p class="mt-1 text-sm text-slate-600">
              Score • Trend • Topics • Commentary — follow the national mood, spot spikes, and share highlights.
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              data-test="onboarding-dismiss"
              @click="dismissOnboarding"
            >
              Got it
            </button>
          </div>
        </div>
      </section>

      <section v-if="fetchError" class="rounded-lg border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-800">
        {{ fetchError.message }}
      </section>

      <section
        v-if="refreshMetadata?.partialFlags.length"
        class="rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900"
        data-test="partial-flags"
      >
        Some insights are partial:
        <ul class="mt-2 list-disc pl-6">
          <li v-if="refreshMetadata.partialFlags.includes('topicsMissing')">
            Topics feed unavailable — showing placeholders.
          </li>
          <li v-if="refreshMetadata.partialFlags.includes('commentaryMissing')">
            Commentary fell back to our neutral summary.
          </li>
        </ul>
      </section>

      <div class="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div class="flex flex-col gap-6">
          <SentimentScore v-if="snapshot" :snapshot="snapshot" />
          <div
            v-else
            class="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 p-6 text-sm text-slate-500"
          >
            Sentiment score is loading…
          </div>

          <SentimentTrend v-if="snapshot" :snapshot="snapshot" />
          <div
            v-else
            class="flex min-h-[200px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 p-6 text-sm text-slate-500"
          >
            Trend data arrives once we collect a full hour.
          </div>
        </div>

        <aside class="flex flex-col gap-6">
          <TopicsList :topics="topicsList" />
          <CommentaryPanel :commentary="commentaryData" />
        </aside>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import SentimentScore from '@/components/sentiment/SentimentScore.vue'
import SentimentTrend from '@/components/sentiment/SentimentTrend.vue'
import CommentaryPanel from '@/components/sentiment/CommentaryPanel.vue'
import TopicsList from '@/components/topics/TopicsList.vue'
import FreshnessBadge from '@/components/shared/FreshnessBadge.vue'
import { useSentimentSnapshot } from '@/composables/useSentimentSnapshot'
import { useTopics } from '@/composables/useTopics'
import { useCommentary } from '@/composables/useCommentary'
import { useOnboardingHint } from '@/composables/useOnboardingHint'
import { STALE_THRESHOLD_MINUTES } from '@/services/refresh-service'
import type { Commentary, RefreshMetadata, RefreshPartialFlag, SentimentSnapshot, Topic } from '@/utils/types'

const sentiment = useSentimentSnapshot({ immediate: false })
const topics = useTopics({ immediate: false })
const commentary = useCommentary({ immediate: false })
const onboarding = useOnboardingHint()

const REFRESH_INTERVAL_MINUTES = 5

const isRefreshing = ref(false)
const fetchError = ref<Error | null>(null)
const refreshMetadata = ref<RefreshMetadata | null>(null)

const snapshot = computed(() => sentiment.snapshot.value)
const topicsList = computed(() => topics.topics.value)
const commentaryData = computed(() => commentary.commentary.value)

const topicsError = computed(() => topics.error.value)

const onboardingHintVisible = computed(() => onboarding.isVisible.value)

function dismissOnboarding(): void {
  onboarding.dismiss()
}

function normaliseError(error: unknown): Error {
  if (error instanceof Error) {
    return error
  }

  return new Error('Something went wrong while refreshing the dashboard.')
}

function parseCandidateTimestamp(value: string | null | undefined): number | null {
  if (!value) {
    return null
  }

  const time = Date.parse(value)
  return Number.isNaN(time) ? null : time
}

function computeRefreshMetadata(
  snapshotValue: SentimentSnapshot | null,
  topicList: Topic[],
  commentaryValue: Commentary,
  topicError: Error | null,
  now: Date = new Date(),
): RefreshMetadata | null {
  if (!snapshotValue) {
    return null
  }

  const partialFlags = new Set<RefreshPartialFlag>()
  if (topicError) {
    partialFlags.add('topicsMissing')
  }
  if (commentaryValue.status !== 'success') {
    partialFlags.add('commentaryMissing')
  }

  const candidates: number[] = []
  const snapshotEnd = parseCandidateTimestamp(snapshotValue.windowEnd)
  if (snapshotEnd !== null) {
    candidates.push(snapshotEnd)
  }

  for (const topic of topicList) {
    const lastSeen = parseCandidateTimestamp(topic.lastSeen)
    if (lastSeen !== null) {
      candidates.push(lastSeen)
    }
  }

  const commentaryTimestamp = parseCandidateTimestamp(commentaryValue.createdAt)
  if (commentaryTimestamp !== null) {
    candidates.push(commentaryTimestamp)
  }

  const latest = candidates.length > 0 ? Math.max(...candidates) : now.getTime()
  const lastRefreshDate = new Date(latest)
  const diffMs = Math.max(0, now.getTime() - lastRefreshDate.getTime())
  const ageMinutes = Math.floor(diffMs / 60000)
  const staleFlag = ageMinutes > STALE_THRESHOLD_MINUTES

  return {
    lastRefreshAt: lastRefreshDate.toISOString(),
    ageMinutes,
    staleFlag,
    partialFlags: Array.from(partialFlags),
  }
}

async function refreshAll(): Promise<void> {
  if (isRefreshing.value) {
    return
  }

  isRefreshing.value = true
  fetchError.value = null

  try {
    const results = await Promise.allSettled([
      sentiment.refresh(),
      topics.refresh(),
      commentary.refresh(),
    ])

    const rejected = results.filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected',
    )

    if (rejected.length > 0) {
      fetchError.value = normaliseError(rejected[0].reason)
    }

    refreshMetadata.value = computeRefreshMetadata(
      snapshot.value,
      topicsList.value,
      commentaryData.value,
      topicsError.value,
    )
  } finally {
    isRefreshing.value = false
  }
}

let refreshTimer: number | null = null

onMounted(() => {
  void refreshAll()

  refreshTimer = window.setInterval(() => {
    void refreshAll()
  }, REFRESH_INTERVAL_MINUTES * 60 * 1000)
})

onBeforeUnmount(() => {
  if (refreshTimer !== null) {
    window.clearInterval(refreshTimer)
    refreshTimer = null
  }
})

</script>
