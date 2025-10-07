<template>
  <section class="rounded-xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60">
    <header class="flex items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-semibold text-slate-900">Trend insights</h2>
        <p class="text-sm text-slate-500" data-test="trend-range">{{ headlineRange }}</p>
      </div>
    </header>

    <div v-if="hasTrendData" class="mt-4 grid gap-2 sm:grid-cols-2">
      <article
        v-for="item in trendItems"
        :key="item.key"
        class="rounded-lg border border-slate-100 bg-white/90 p-3 shadow-sm"
        data-test="trend-item"
      >
        <p class="text-xs uppercase tracking-wide text-slate-500">{{ item.range }}</p>
        <p class="text-2xl font-semibold text-slate-800">{{ item.scoreLabel }}</p>
      </article>
    </div>
    <p v-else class="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-500" data-test="trend-empty">
      Trend data not yet available — we need a few more hours of chatter.
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SentimentSnapshot } from '@/utils/types'
import { FALLBACK_PLACEHOLDER, formatHourRange } from '@/utils/formatting'

const props = defineProps<{ snapshot: SentimentSnapshot }>()

const headlineRange = computed(() => formatHourRange(props.snapshot.windowStart, props.snapshot.windowEnd))

const hasTrendData = computed(() => props.snapshot.prior12hScores.length > 0)

function safeIso(date: Date): string {
  const time = date.getTime()
  if (Number.isNaN(time)) {
    return ''
  }
  return new Date(time).toISOString()
}

const trendItems = computed(() => {
  if (!hasTrendData.value) {
    return []
  }

  const endCurrentWindow = new Date(props.snapshot.windowStart)
  if (Number.isNaN(endCurrentWindow.getTime())) {
    return props.snapshot.prior12hScores.map((score, index) => ({
      key: index,
      range: 'Previous hour',
      scoreLabel: `${score}`,
    }))
  }

  return props.snapshot.prior12hScores.map((score, index) => {
    const hoursBack = props.snapshot.prior12hScores.length - index
    const hourEnd = new Date(endCurrentWindow.getTime() - (hoursBack * 60 * 60 * 1000))
    const hourStart = new Date(hourEnd.getTime() - 60 * 60 * 1000)

    const range = formatHourRange(safeIso(hourStart), safeIso(hourEnd))

    return {
      key: `${hoursBack}-${score}`,
      range: range === FALLBACK_PLACEHOLDER ? 'Previous hour' : range,
      scoreLabel: `${score}`,
    }
  })
})
</script>
