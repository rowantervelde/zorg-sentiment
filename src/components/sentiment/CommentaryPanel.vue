<template>
  <section
    class="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/70"
    role="region"
    aria-labelledby="commentary-heading"
    aria-live="polite"
    aria-atomic="true"
  >
    <header class="flex items-center justify-between gap-3">
      <h2 id="commentary-heading" class="text-lg font-semibold text-slate-900">Mood commentary</h2>
      <span
        class="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white"
        aria-hidden="true"
        data-test="commentary-tag"
      >
        🤖 AI Generated
      </span>
    </header>

    <p v-if="hasCommentary" class="mt-4 text-base text-slate-700" data-test="commentary-text">
      {{ commentary.text }}
    </p>

    <p v-else class="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-500" data-test="commentary-empty">
      Mood summary unavailable — data still live.
    </p>

    <footer v-if="hasCommentary && commentary.includesTopics.length" class="mt-4 text-xs text-slate-500">
      Highlights: {{ commentary.includesTopics.join(', ') }}
    </footer>

    <p class="sr-only">
      {{ hasCommentary ? 'AI commentary loaded.' : 'AI commentary unavailable; fallback message shown.' }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Commentary } from '@/utils/types'

const props = defineProps<{ commentary: Commentary }>()

const hasCommentary = computed(() => Boolean(props.commentary.text && props.commentary.status === 'success'))
</script>
