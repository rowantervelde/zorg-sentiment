<template>
  <section class="rounded-xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60">
    <header class="flex items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-slate-900">Trending topics</h2>
        <p class="text-sm text-slate-500">Ranked by momentum over the past 3 hours</p>
      </div>
    </header>

    <ol v-if="hasTopics" class="mt-4 space-y-3">
      <li
        v-for="(topic, index) in topTopics"
        :key="topic.name"
        class="rounded-lg border border-slate-100 bg-white/90 p-3 shadow-sm"
        data-test="topic-item"
      >
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="text-sm font-medium uppercase tracking-wide text-slate-400">
              #{{ (index + 1).toString().padStart(2, '0') }}
            </p>
            <h3 class="text-lg font-semibold text-slate-900">{{ topic.name }}</h3>
          </div>
          <div class="flex flex-col items-end gap-1 text-right text-sm text-slate-500">
            <span class="font-semibold text-slate-800">{{ formatPercent(topic.growthPercent) }} momentum</span>
            <span>{{ formatMentions(topic.currentMentions3h) }} mentions</span>
          </div>
        </div>

        <dl class="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-600 sm:grid-cols-4">
          <div>
            <dt class="text-slate-400">Positive</dt>
            <dd>{{ formatPercent(topic.positivePct) }}</dd>
          </div>
          <div>
            <dt class="text-slate-400">Neutral</dt>
            <dd>{{ formatPercent(topic.neutralPct) }}</dd>
          </div>
          <div>
            <dt class="text-slate-400">Negative</dt>
            <dd>{{ formatPercent(topic.negativePct) }}</dd>
          </div>
          <div>
            <dt class="text-slate-400">Net polarity</dt>
            <dd>{{ formatSigned(topic.netPolarity) }}</dd>
          </div>
        </dl>

        <div v-if="topic.polarizingFlag" class="mt-3 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800" data-test="topic-polarizing">
          <span>⚠</span>
          <span>Polarising sentiment</span>
        </div>
      </li>
    </ol>

    <p v-else class="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-500" data-test="topic-empty">
      No active topic clusters — check back soon.
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Topic } from '@/utils/types'
import { FALLBACK_PLACEHOLDER, formatCompactNumber, formatNumber, formatPercentage } from '@/utils/formatting'

const props = defineProps<{
  topics: Topic[]
  limit?: number
}>()

const limit = computed(() => (props.limit && props.limit > 0 ? props.limit : 10))

const sortedTopics = computed(() => {
  return [...props.topics].sort((a, b) => {
    const growthA = typeof a.growthPercent === 'number' ? a.growthPercent : -Infinity
    const growthB = typeof b.growthPercent === 'number' ? b.growthPercent : -Infinity

    if (growthA === growthB) {
      return b.currentMentions3h - a.currentMentions3h
    }

    return growthB - growthA
  })
})

const topTopics = computed(() => sortedTopics.value.slice(0, limit.value))

const hasTopics = computed(() => topTopics.value.length > 0)

function formatPercent(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return FALLBACK_PLACEHOLDER
  }

  return formatPercentage(value, undefined, value < 10 ? 1 : 0)
}

function formatMentions(value: number): string {
  if (!Number.isFinite(value)) {
    return FALLBACK_PLACEHOLDER
  }

  if (value >= 1000) {
    return formatCompactNumber(value)
  }

  return formatNumber(value)
}

function formatSigned(value: number): string {
  if (!Number.isFinite(value)) {
    return FALLBACK_PLACEHOLDER
  }

  const formatted = formatNumber(Math.abs(value))
  if (value > 0) {
    return `+${formatted}`
  }
  if (value < 0) {
    return `-${formatted}`
  }
  return formatted
}
</script>
