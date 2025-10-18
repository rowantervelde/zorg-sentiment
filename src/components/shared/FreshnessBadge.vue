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
    <span v-if="isStale" class="text-xs text-slate-600">Data may be stale</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RefreshMetadata } from '@/utils/types'
import { FALLBACK_PLACEHOLDER, formatAgeMinutes, formatIsoTime } from '@/utils/formatting'

const props = defineProps<{ refresh: RefreshMetadata }>()

const timePart = computed(() => formatIsoTime(props.refresh.lastRefreshAt))
const agePart = computed(() => formatAgeMinutes(props.refresh.ageMinutes))

const timestampDisplay = computed(() => {
  if ([timePart.value, agePart.value].includes(FALLBACK_PLACEHOLDER)) {
    return 'Last updated: unavailable'
  }

  return `${timePart.value} (${agePart.value})`
})

const isStale = computed(() => props.refresh.staleFlag || props.refresh.ageMinutes > 30)

const state = computed(() => (isStale.value ? 'stale' : 'fresh'))

const stateClasses = computed(() =>
  isStale.value
    ? 'border-amber-700 bg-amber-700 text-white'
    : 'border-emerald-700 bg-emerald-700 text-white',
)

const dotClasses = computed(() =>
  isStale.value ? 'bg-amber-300' : 'bg-emerald-300',
)
</script>
