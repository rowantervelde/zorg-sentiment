<template>
  <div
    :data-state="state"
    class="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium shadow-sm"
    :class="stateClasses"
    role="status"
    aria-live="polite"
  >
    <span class="inline-flex h-2 w-2 rounded-full" :class="dotClasses" aria-hidden="true" />
    <span data-test="freshness-timestamp">{{ timestampDisplay }}</span>
    <span v-if="isStaleComputed" class="ml-1 text-xs">⏱️ Stale</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RefreshMetadata } from '@/utils/types'
import { FALLBACK_PLACEHOLDER, formatAgeMinutes, formatIsoTime } from '@/utils/formatting'

// T036: Support both RefreshMetadata (existing) and direct ageMinutes/isStale props (new)
const props = defineProps<{ 
  refresh?: RefreshMetadata;
  ageMinutes?: number;
  isStale?: boolean;
  lastUpdated?: string;
}>()

const timePart = computed(() => {
  if (props.refresh) {
    return formatIsoTime(props.refresh.lastRefreshAt)
  }
  return props.lastUpdated ? formatIsoTime(props.lastUpdated) : ''
})

const agePart = computed(() => {
  const minutes = props.refresh ? props.refresh.ageMinutes : (props.ageMinutes ?? 0)
  return formatAgeMinutes(minutes)
})

const timestampDisplay = computed(() => {
  if ([timePart.value, agePart.value].includes(FALLBACK_PLACEHOLDER)) {
    return 'Last updated: unavailable'
  }

  if (timePart.value) {
    return `${timePart.value} (${agePart.value})`
  }
  
  return `Updated ${agePart.value} ago`
})

const isStaleComputed = computed(() => {
  if (props.isStale !== undefined) {
    return props.isStale
  }
  if (props.refresh) {
    return props.refresh.staleFlag || props.refresh.ageMinutes > 30
  }
  return (props.ageMinutes ?? 0) > 30
})

const state = computed(() => (isStaleComputed.value ? 'stale' : 'fresh'))

const stateClasses = computed(() =>
  isStaleComputed.value
    ? 'border-amber-700 bg-amber-700 text-white'
    : 'border-emerald-700 bg-emerald-700 text-white',
)

const dotClasses = computed(() =>
  isStaleComputed.value ? 'bg-amber-300' : 'bg-emerald-300',
)
</script>
