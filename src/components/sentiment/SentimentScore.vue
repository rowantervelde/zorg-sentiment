<template><template>

  <section  <section

    :class="[    :class="[

      'rounded-xl border border-slate-200 p-6 shadow-sm',      'rounded-xl border border-slate-200 p-6 shadow-sm',

      moodLabel.bg      moodLabel.bg

    ]"    ]"

    role="region"    role="region"

    aria-labelledby="sentiment-score-heading"    aria-labelledby="sentiment-score-heading"

    aria-describedby="sentiment-score-summary"    aria-describedby="sentiment-score-summary"

  >  >

    <header class="flex items-start justify-between gap-3">    <header class="flex items-start justify-between gap-3">

      <div class="flex items-baseline gap-4">      <div class="flex items-baseline gap-4">

        <span        <span

          id="sentiment-score-heading"          id="sentiment-score-heading"

          class="text-6xl font-bold tracking-tight text-slate-900"          class="text-6xl font-bold tracking-tight text-slate-900"

          data-test="score-value"          data-test="score-value"

        >        >

          {{ scoreDisplay }}          {{ scoreDisplay }}

        </span>        </span>

        <div class="flex flex-col gap-1">        <div class="flex flex-col gap-1">

          <span class="text-xs font-medium uppercase tracking-wide text-slate-500">Mood Score</span>          <span class="text-xs font-medium uppercase tracking-wide text-slate-500">Mood Score</span>

          <span           <span 

            :class="['text-2xl font-bold', moodLabel.color]"            :class="['text-2xl font-bold', moodLabel.color]"

            data-test="score-label"            data-test="score-label"

          >          >

            {{ moodLabel.label }}            {{ moodLabel.label }}

          </span>          </span>

        </div>        </div>

      </div>      </div>

    </header>    </header>



    <p id="sentiment-score-summary" class="sr-only">    <p id="sentiment-score-summary" class="sr-only">

      {{ scoreSummary }}      {{ scoreSummary }}

    </p>    </p>



    <dl class="mt-6 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3" aria-live="polite">    <dl class="mt-6 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3" aria-live="polite">

      <div class="flex flex-col gap-1">      <div class="flex flex-col gap-1">

        <dt class="font-medium text-slate-500">Trend</dt>        <dt class="font-medium text-slate-500">Trend</dt>

        <dd data-test="score-trend" :class="trendColor">        <dd data-test="score-trend" :class="trendColor">

          <span class="sr-only">{{ trendLabel }}</span>          <span class="sr-only">{{ trendLabel }}</span>

          <span aria-hidden="true" class="mr-1 text-lg font-bold">{{ trendIcon }}</span>          <span aria-hidden="true" class="mr-1 text-lg font-bold">{{ trendIcon }}</span>

          <span class="font-semibold">{{ props.snapshot.trend }}</span>          <span class="font-semibold">{{ trendLabel }}</span>

        </dd>        </dd>

      </div>      </div>

            

      <div class="flex flex-col gap-1">      <div class="flex flex-col gap-1">

        <dt class="font-medium text-slate-500">Confidence</dt>        <dt class="font-medium text-slate-500">Confidence</dt>

        <dd :class="confidenceColor">        <dd :class="confidenceColor">

          <span class="font-semibold">{{ confidenceLabel }}</span>          <span class="font-semibold">{{ confidenceLabel }}</span>

          <span class="text-slate-600 ml-2 text-xs">          <span class="text-slate-600 ml-2 text-xs">

            ({{ props.snapshot.data_quality.sample_size }} posts)            ({{ snapshot.data_quality.sample_size }} posts)

          </span>          </span>

        </dd>        </dd>

      </div>      </div>

            

      <div class="flex flex-col gap-1">      <div class="flex flex-col gap-1">

        <dt class="font-medium text-slate-500">Stability</dt>        <dt class="font-medium text-slate-500">Stability</dt>

        <dd :class="props.snapshot.spike_detected ? 'text-orange-600 font-semibold' : 'text-slate-600'">        <dd :class="snapshot.spike_detected ? 'text-orange-600 font-semibold' : 'text-slate-600'">

          {{ spikeText }}          {{ spikeText }}

        </dd>        </dd>

      </div>      </div>

    </dl>    </dl>



    <!-- Data sources status -->    <!-- Data sources status -->

    <div class="mt-6 pt-4 border-t border-slate-200">    <div class="mt-6 pt-4 border-t border-slate-200">

      <p class="text-xs text-slate-500 mb-2">Data sources:</p>      <p class="text-xs text-slate-500 mb-2">Data sources:</p>

      <div class="flex gap-2 flex-wrap">      <div class="flex gap-2 flex-wrap">

        <span        <span

          v-for="source in props.snapshot.sources"          v-for="source in snapshot.sources"

          :key="source.source_id"          :key="source.source_id"

          :class="[          :class="[

            'px-2 py-1 text-xs rounded-full',            'px-2 py-1 text-xs rounded-full',

            source.status === 'available'             source.status === 'available' 

              ? 'bg-green-100 text-green-700'               ? 'bg-green-100 text-green-700' 

              : 'bg-red-100 text-red-700'              : 'bg-red-100 text-red-700'

          ]"          ]"

          :title="source.error_message || 'Available'"          :title="source.error_message || 'Available'"

        >        >

          {{ source.source_id }}          {{ source.source_id }}

        </span>        </span>

      </div>      </div>

    </div>    </div>

  </section>  </section>

</template></template>



<script setup lang="ts"><script setup lang="ts">

import { computed } from 'vue'import { computed } from 'vue'

import type { SentimentSnapshot } from '~/types/sentiment'import type { SentimentSnapshot } from '~/types/sentiment'



const props = defineProps<{const props = defineProps<{

  snapshot: SentimentSnapshot  snapshot: SentimentSnapshot

}>()}>()



// Convert -1.0 to +1.0 score to 0-100 scale (T024)// Convert -1.0 to +1.0 score to 0-100 scale (T024)

const scoreDisplay = computed(() => {const scoreDisplay = computed(() => {

  const normalized = ((props.snapshot.overall_score + 1) / 2) * 100  const normalized = ((props.snapshot.overall_score + 1) / 2) * 100

  return Math.round(normalized).toString()  return Math.round(normalized).toString()

})})



// Determine mood label based on score (T024)// Determine mood label based on score (T024)

const moodLabel = computed(() => {const moodLabel = computed(() => {

  const score = parseFloat(scoreDisplay.value)  const score = parseFloat(scoreDisplay.value)

  if (score >= 70) return { label: 'Sunny', color: 'text-green-700', bg: 'bg-green-50' }  if (score >= 70) return { label: 'Sunny', color: 'text-green-700', bg: 'bg-green-50' }

  if (score >= 55) return { label: 'Upbeat', color: 'text-emerald-700', bg: 'bg-emerald-50' }  if (score >= 55) return { label: 'Upbeat', color: 'text-emerald-700', bg: 'bg-emerald-50' }

  if (score >= 45) return { label: 'Mixed', color: 'text-slate-700', bg: 'bg-slate-50' }  if (score >= 45) return { label: 'Mixed', color: 'text-slate-700', bg: 'bg-slate-50' }

  if (score >= 30) return { label: 'Tense', color: 'text-orange-700', bg: 'bg-orange-50' }  if (score >= 30) return { label: 'Tense', color: 'text-orange-700', bg: 'bg-orange-50' }

  return { label: 'Bleak', color: 'text-red-700', bg: 'bg-red-50' }  return { label: 'Bleak', color: 'text-red-700', bg: 'bg-red-50' }

})})



// Trend display// Trend display

const trendIcon = computed(() => {const trendIcon = computed(() => {

  if (props.snapshot.trend === 'rising') return '↑'  if (props.snapshot.trend === 'rising') return '↑'

  if (props.snapshot.trend === 'falling') return '↓'  if (props.snapshot.trend === 'falling') return '↓'

  return '→'  return '→'

})})



const trendLabel = computed(() => {const trendLabel = computed(() => {

  if (props.snapshot.trend === 'rising') return 'Sentiment is rising'  if (props.snapshot.trend === 'rising') return 'Sentiment is rising'

  if (props.snapshot.trend === 'falling') return 'Sentiment is falling'  if (props.snapshot.trend === 'falling') return 'Sentiment is falling'

  return 'Sentiment is stable'  return 'Sentiment is stable'

})})



const trendColor = computed(() => {const trendColor = computed(() => {

  if (props.snapshot.trend === 'rising') return 'text-green-600'  if (props.snapshot.trend === 'rising') return 'text-green-600'

  if (props.snapshot.trend === 'falling') return 'text-red-600'  if (props.snapshot.trend === 'falling') return 'text-red-600'

  return 'text-slate-600'  return 'text-slate-600'

})})



// Data quality indicators// Data quality indicators

const confidenceLabel = computed(() => {const confidenceLabel = computed(() => {

  const conf = props.snapshot.data_quality.confidence  const conf = props.snapshot.data_quality.confidence

  return conf.charAt(0).toUpperCase() + conf.slice(1)  return conf.charAt(0).toUpperCase() + conf.slice(1)

})})



const confidenceColor = computed(() => {const confidenceColor = computed(() => {

  const conf = props.snapshot.data_quality.confidence  const conf = props.snapshot.data_quality.confidence

  if (conf === 'high') return 'text-green-600'  if (conf === 'high') return 'text-green-600'

  if (conf === 'medium') return 'text-yellow-600'  if (conf === 'medium') return 'text-yellow-600'

  return 'text-red-600'  return 'text-red-600'

})})



// Spike indicator// Spike indicator

const spikeText = computed(() => {const spikeText = computed(() => {

  return props.snapshot.spike_detected ? 'Unusual shift detected' : 'Normal variation'  return props.snapshot.spike_detected ? 'Unusual shift detected' : 'Normal variation'

})})



const scoreSummary = computed(() => {const scoreSummary = computed(() => {

  return `Overall sentiment score is ${scoreDisplay.value} out of 100, labeled ${moodLabel.value.label}. ${trendLabel.value}.`  return `Overall sentiment score is ${scoreDisplay.value} out of 100, labeled ${moodLabel.value.label}. ${trendLabel.value}.`

})})

</script></script>

