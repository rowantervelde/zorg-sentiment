<template>
  <section
    class="rounded-xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60"
    aria-labelledby="sentiment-score-heading"
  >
    <header class="flex items-start justify-between gap-3">
      <div class="flex items-baseline gap-3">
        <span
          id="sentiment-score-heading"
          class="text-5xl font-semibold tracking-tight text-slate-900"
          data-test="score-value"
        >
          {{ scoreDisplay }}
        </span>
        <div class="flex flex-col">
          <span class="text-sm font-medium uppercase tracking-wide text-slate-500">Mood score</span>
          <span class="text-lg font-semibold text-slate-800" data-test="score-label">{{ band.label }}</span>
        </div>
      </div>
      <button
        type="button"
        class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
        title="Aggregated normalized sentiment of recent public discussions"
        aria-label="How the score is calculated"
        data-test="score-tooltip"
      >
        ?
      </button>
    </header>

    <dl class="mt-4 grid grid-cols-1 gap-3 text-sm text-slate-600 sm:grid-cols-3">
      <div class="flex flex-col gap-1">
        <dt class="font-medium text-slate-500">Trend</dt>
        <dd data-test="score-trend">
          <span class="mr-1 text-base">{{ trendIcon }}</span>{{ trendDelta }}
        </dd>
      </div>
      <div class="flex flex-col gap-1">
        <dt class="font-medium text-slate-500">30-day range</dt>
        <dd>{{ historyRange }}</dd>
      </div>
      <div class="flex flex-col gap-1">
        <dt class="font-medium text-slate-500">Tone</dt>
        <dd>{{ band.headline }}</dd>
      </div>
    </dl>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SentimentSnapshot } from '@/utils/types'
import { determineTrend, getBandForScore } from '@/utils/scoring'
import { formatNumber } from '@/utils/formatting'

const props = defineProps<{
  snapshot: SentimentSnapshot
}>()

const band = computed(() => getBandForScore(props.snapshot.compositeScore))

const scoreDisplay = computed(() => formatNumber(Math.round(props.snapshot.compositeScore)))

const previousScore = computed(() => {
  const values = props.snapshot.prior12hScores
  return values.length > 0 ? values[values.length - 1] : props.snapshot.compositeScore
})

const trendDeltaValue = computed(() => props.snapshot.compositeScore - previousScore.value)

const trendIcon = computed(() => {
  const trend = determineTrend(props.snapshot.compositeScore, previousScore.value)
  if (trend === 'up') {
    return '↑'
  }
  if (trend === 'down') {
    return '↓'
  }
  return '→'
})

const trendDelta = computed(() => {
  const delta = trendDeltaValue.value
  const formatted = Math.abs(delta).toFixed(1)
  if (delta > 0) {
    return `+${formatted}`
  }
  if (delta < 0) {
    return `-${formatted}`
  }
  return formatted
})

const historyRange = computed(() => {
  const minimum = formatNumber(Math.round(props.snapshot.min30Day))
  const maximum = formatNumber(Math.round(props.snapshot.max30Day))
  return `${minimum} – ${maximum}`
})
</script>
