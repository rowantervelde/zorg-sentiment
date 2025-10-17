<template>
  <section
    :class="[
      'rounded-xl border border-slate-200 p-6 shadow-sm',
      moodLabel.bg
    ]"
    role="region"
    aria-labelledby="sentiment-score-heading"
    aria-describedby="sentiment-score-summary"
  >
    <header class="flex items-start justify-between gap-3">
      <div class="flex items-baseline gap-4">
        <span
          id="sentiment-score-heading"
          class="text-6xl font-bold tracking-tight text-slate-900"
          data-test="score-value"
        >
          {{ scoreDisplay }}
        </span>
        <div class="flex flex-col gap-1">
          <span class="text-xs font-medium uppercase tracking-wide text-slate-500">Mood Score</span>
          <span 
            :class="['text-2xl font-bold', moodLabel.color]"
            data-test="score-label"
          >
            {{ moodLabel.label }}
          </span>
        </div>
      </div>
    </header>

    <p id="sentiment-score-summary" class="sr-only">
      {{ scoreSummary }}
    </p>

    <dl class="mt-6 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3" aria-live="polite">
      <div class="flex flex-col gap-1">
        <dt class="font-medium text-slate-500">Trend</dt>
        <dd data-test="score-trend" :class="trendColor">
          <span class="sr-only">{{ trendLabel }}</span>
          <span aria-hidden="true" class="mr-1 text-lg font-bold">{{ trendIcon }}</span>
          <span class="font-semibold">{{ trendLabel }}</span>
        </dd>
      </div>

      <div class="flex flex-col gap-1">
        <dt class="font-medium text-slate-500">Confidence</dt>
        <dd :class="confidenceColor">
          <span class="font-semibold">{{ confidenceLabel }}</span>
          <span class="text-slate-600 ml-2 text-xs">
            ({{ props.snapshot.data_quality.sample_size }} posts)
          </span>
        </dd>
      </div>

      <div class="flex flex-col gap-1">
        <dt class="font-medium text-slate-500">Stability</dt>
        <dd :class="spikeColor" data-test="spike-indicator">
          <span v-if="props.snapshot.spike_detected" class="font-bold mr-1 text-xl" aria-hidden="true">{{ spikeIcon }}</span>
          <span class="font-semibold">{{ spikeText }}</span>
        </dd>
      </div>
    </dl>

    <div class="mt-6 pt-4 border-t border-slate-200">
      <p class="text-xs text-slate-500 mb-2">Data sources:</p>
      <div class="flex gap-2 flex-wrap">
        <span
          v-for="source in props.snapshot.sources"
          :key="source.source_id"
          :class="[
            'px-2 py-1 text-xs rounded-full',
            source.status === 'available'
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          ]"
          :title="source.error_message || 'Available'"
        >
          {{ source.source_id }}
        </span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SentimentSnapshot } from '~/types/sentiment'

const props = defineProps<{
  snapshot: SentimentSnapshot
}>()

const scoreDisplay = computed(() => {
  const normalized = ((props.snapshot.overall_score + 1) / 2) * 100
  return Math.round(normalized).toString()
})

const moodLabel = computed(() => {
  const score = parseFloat(scoreDisplay.value)
  if (score >= 70) return { label: 'Sunny', color: 'text-green-700', bg: 'bg-green-50' }
  if (score >= 55) return { label: 'Upbeat', color: 'text-emerald-700', bg: 'bg-emerald-50' }
  if (score >= 45) return { label: 'Mixed', color: 'text-slate-700', bg: 'bg-slate-50' }
  if (score >= 30) return { label: 'Tense', color: 'text-orange-700', bg: 'bg-orange-50' }
  return { label: 'Bleak', color: 'text-red-700', bg: 'bg-red-50' }
})

const trendIcon = computed(() => {
  if (props.snapshot.trend === 'rising') return ''
  if (props.snapshot.trend === 'falling') return ''
  return ''
})

const trendLabel = computed(() => {
  if (props.snapshot.trend === 'rising') return 'Sentiment is rising'
  if (props.snapshot.trend === 'falling') return 'Sentiment is falling'
  return 'Sentiment is stable'
})

const trendColor = computed(() => {
  if (props.snapshot.trend === 'rising') return 'text-green-600'
  if (props.snapshot.trend === 'falling') return 'text-red-600'
  return 'text-slate-600'
})

const confidenceLabel = computed(() => {
  const conf = props.snapshot.data_quality.confidence
  return conf.charAt(0).toUpperCase() + conf.slice(1)
})

const confidenceColor = computed(() => {
  const conf = props.snapshot.data_quality.confidence
  if (conf === 'high') return 'text-green-600'
  if (conf === 'medium') return 'text-yellow-600'
  return 'text-red-600'
})

const spikeIcon = computed(() => {
  if (!props.snapshot.spike_detected) return ''
  if (props.snapshot.spike_direction === 'positive') return '🔼'
  if (props.snapshot.spike_direction === 'negative') return '🔽'
  return '⚠️'
})

const spikeColor = computed(() => {
  if (!props.snapshot.spike_detected) return 'text-slate-600'
  if (props.snapshot.spike_direction === 'positive') return 'text-green-600 font-semibold'
  if (props.snapshot.spike_direction === 'negative') return 'text-red-600 font-semibold'
  return 'text-orange-600 font-semibold'
})

const spikeText = computed(() => {
  if (!props.snapshot.spike_detected) return 'Normal variation'
  if (props.snapshot.spike_direction === 'positive') return 'Unusual positive shift'
  if (props.snapshot.spike_direction === 'negative') return 'Unusual negative shift'
  return 'Unusual shift detected'
})

const scoreSummary = computed(() => {
  let summary = `Overall sentiment score is ${scoreDisplay.value} out of 100, labeled ${moodLabel.value.label}. ${trendLabel.value}.`
  
  if (props.snapshot.spike_detected && props.snapshot.spike_direction) {
    summary += ` Alert: ${spikeText.value}.`
  }
  
  return summary
})
</script>
