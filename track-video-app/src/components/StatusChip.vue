<template>
  <v-chip
    :color="appearance.color"
    :prepend-icon="appearance.icon"
    :variant="props.status === 'completed' ? 'flat' : 'tonal'"
    :size="props.size ?? 'small'"
    class="status-chip"
  >
    {{ appearance.label }}
  </v-chip>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TrackVideoJobStatus } from '@/types/trackVideo'

const props = defineProps<{
  status: TrackVideoJobStatus
  size?: 'x-small' | 'small'
}>()

const appearance = computed(() => {
  const values = {
    queued: {
      color: 'warning',
      icon: 'mdi-timer-sand',
      label: 'Queued',
    },
    processing: {
      color: 'info',
      icon: 'mdi-motion-play-outline',
      label: 'Rendering',
    },
    completed: {
      color: 'success',
      icon: 'mdi-check-circle',
      label: 'Ready',
    },
    failed: {
      color: 'error',
      icon: 'mdi-alert-circle',
      label: 'Failed',
    },
  } satisfies Record<TrackVideoJobStatus, {
    color: string
    icon: string
    label: string
  }>

  return values[props.status]
})
</script>

<style scoped>
.status-chip {
  font-weight: 700;
  letter-spacing: -0.01em;
}
</style>
