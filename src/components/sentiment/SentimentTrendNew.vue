<template>
  <section
    class="rounded-xl border border-slate-200 p-6 shadow-sm bg-white"
    role="region"
    aria-labelledby="sentiment-trend-heading"
    aria-describedby="sentiment-trend-summary"
  >
    <header class="mb-4">
      <h2 id="sentiment-trend-heading" class="text-lg font-semibold text-slate-900">
        24-Hour Sentiment Trend
      </h2>
      <p class="text-sm text-slate-500">Hourly sentiment over the past day</p>
    </header>

    <p id="sentiment-trend-summary" class="sr-only">
      {{ trendSummary }}
    </p>

    <!-- Sparkline visualization -->
    <div class="relative h-24 mb-4" aria-hidden="true">
      <svg
        :viewBox="`0 0 ${width} ${height}`"
        class="w-full h-full"
        preserveAspectRatio="none"
      >
        <!-- Grid lines -->
        <line
          v-for="i in 5"
          :key="`grid-${i}`"
          :x1="0"
          :y1="(i - 1) * (height / 4)"
          :x2="width"
          :y2="(i - 1) * (height / 4)"
          stroke="#e2e8f0"
          stroke-width="1"
        />

        <!-- Trend line -->
        <polyline
          :points="trendLinePoints"
          fill="none"
          :stroke="trendColor"
          stroke-width="2"
          stroke-linejoin="round"
          stroke-linecap="round"
        />

        <!-- Area fill -->
        <polygon
          :points="trendAreaPoints"
          :fill="trendFillColor"
          opacity="0.2"
        />

        <!-- Data points -->
        <circle
          v-for="(point, index) in dataPoints"
          :key="`point-${index}`"
          :cx="point.x"
          :cy="point.y"
          r="3"
          :fill="point.score >= 0 ? '#10b981' : '#ef4444'"
          :class="{ 'opacity-30': hourlyBuckets[index].post_count === 0 }"
        />
      </svg>
    </div>

    <!-- Stats summary -->
    <dl class="grid grid-cols-3 gap-4 text-sm">
      <div class="flex flex-col gap-1">
        <dt class="font-medium text-slate-500">Average</dt>
        <dd :class="averageScore >= 0 ? 'text-green-600' : 'text-red-600'" class="text-lg font-semibold">
          {{ formatScore(averageScore) }}
        </dd>
      </div>

      <div class="flex flex-col gap-1">
        <dt class="font-medium text-slate-500">Range</dt>
        <dd class="text-lg font-semibold text-slate-800">
          {{ formatScore(minScore) }} → {{ formatScore(maxScore) }}
        </dd>
      </div>

      <div class="flex flex-col gap-1">
        <dt class="font-medium text-slate-500">Data Points</dt>
        <dd class="text-lg font-semibold text-slate-800">
          {{ dataPointsCount }}/24
        </dd>
      </div>
    </dl>

    <!-- Color legend -->
    <div class="mt-4 flex items-center gap-4 text-xs text-slate-600">
      <div class="flex items-center gap-1">
        <div class="w-3 h-3 rounded-full bg-green-500" />
        <span>Positive sentiment</span>
      </div>
      <div class="flex items-center gap-1">
        <div class="w-3 h-3 rounded-full bg-red-500" />
        <span>Negative sentiment</span>
      </div>
      <div class="flex items-center gap-1">
        <div class="w-3 h-3 rounded-full bg-slate-300" />
        <span>No data</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { SentimentSnapshot } from '~/types/sentiment';

const props = defineProps<{
  snapshot: SentimentSnapshot;
}>();

const hourlyBuckets = computed(() => props.snapshot.hourly_buckets || []);

const width = 600;
const height = 100;

// Calculate score range for scaling
const minScore = computed(() => {
  const scores = hourlyBuckets.value
    .filter(b => b.post_count > 0)
    .map(b => b.aggregate_score);
  return scores.length > 0 ? Math.min(...scores) : -1;
});

const maxScore = computed(() => {
  const scores = hourlyBuckets.value
    .filter(b => b.post_count > 0)
    .map(b => b.aggregate_score);
  return scores.length > 0 ? Math.max(...scores) : 1;
});

const averageScore = computed(() => {
  const scores = hourlyBuckets.value
    .filter(b => b.post_count > 0)
    .map(b => b.aggregate_score);
  return scores.length > 0 
    ? scores.reduce((sum, s) => sum + s, 0) / scores.length 
    : 0;
});

const dataPointsCount = computed(() => {
  return hourlyBuckets.value.filter(b => b.post_count > 0).length;
});

// Scale score (-1 to +1) to Y coordinate
function scaleY(score: number): number {
  const range = maxScore.value - minScore.value;
  const normalized = range > 0 ? (score - minScore.value) / range : 0.5;
  return height - (normalized * height);
}

// Calculate data points for visualization
const dataPoints = computed(() => {
  return hourlyBuckets.value.map((bucket, index) => {
    const x = (index / (hourlyBuckets.value.length - 1)) * width;
    const y = scaleY(bucket.aggregate_score);
    return {
      x,
      y,
      score: bucket.aggregate_score,
    };
  });
});

// Create polyline points string for trend line
const trendLinePoints = computed(() => {
  return dataPoints.value
    .map(point => `${point.x},${point.y}`)
    .join(' ');
});

// Create polygon points string for area fill
const trendAreaPoints = computed(() => {
  const points = dataPoints.value
    .map(point => `${point.x},${point.y}`)
    .join(' ');
  return `${points} ${width},${height} 0,${height}`;
});

// Determine trend color based on overall direction
const trendColor = computed(() => {
  return props.snapshot.trend === 'rising' ? '#10b981' 
    : props.snapshot.trend === 'falling' ? '#ef4444' 
    : '#64748b';
});

const trendFillColor = computed(() => {
  return props.snapshot.trend === 'rising' ? '#10b981' 
    : props.snapshot.trend === 'falling' ? '#ef4444' 
    : '#64748b';
});

// Format score for display
function formatScore(score: number): string {
  return score >= 0 ? `+${score.toFixed(2)}` : score.toFixed(2);
}

// Accessibility summary
const trendSummary = computed(() => {
  const direction = props.snapshot.trend === 'rising' ? 'rising' 
    : props.snapshot.trend === 'falling' ? 'falling' 
    : 'stable';
  
  return `Sentiment trend over 24 hours is ${direction}. Average score is ${formatScore(averageScore.value)}. Range from ${formatScore(minScore.value)} to ${formatScore(maxScore.value)}. ${dataPointsCount.value} of 24 hours have data.`;
});
</script>
