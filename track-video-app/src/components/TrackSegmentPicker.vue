<template>
  <section class="segment-picker" aria-labelledby="segment-heading">
    <div class="segment-heading">
      <h2 id="segment-heading">Track segment</h2>
      <span v-if="valid">{{ clipDuration.toFixed(2).replace(/\.00$/, '') }} seconds</span>
    </div>
    <p>Choose where the video starts. It includes up to 15 seconds of audio.</p>
    <input
      class="segment-slider"
      type="range"
      aria-label="Segment start position"
      min="0"
      :max="maxStart"
      step="0.01"
      :value="valid ? Number(modelValue) : 0"
      :disabled="disabled"
      @input="updateStart(($event.target as HTMLInputElement).value)"
    />
    <div class="segment-scale"><span>0:00</span><span>{{ segmentTime(durationSeconds) }}</span></div>
    <div class="segment-controls">
      <v-text-field
        :model-value="modelValue"
        label="Start (seconds)"
        type="number"
        min="0"
        :max="maxStart"
        step="0.01"
        :disabled="disabled"
        :error="!valid"
        variant="outlined"
        density="compact"
        hide-details
        @update:model-value="updateStart"
      />
      <div class="segment-window" aria-live="polite">
        {{ valid ? `${segmentTime(Number(modelValue))} → ${segmentTime(Number(modelValue) + clipDuration)}` : 'Enter a valid start time' }}
      </div>
      <v-btn variant="tonal" :disabled="disabled || !valid" :prepend-icon="playing ? 'mdi-stop' : 'mdi-play'" @click="togglePlayback">
        {{ playing ? 'Stop audio' : 'Listen to segment' }}
      </v-btn>
    </div>
    <p v-if="!valid" class="segment-error" role="alert">Start must be at least 0 and before the end of the track.</p>
    <p v-if="audioError" class="segment-error" role="alert">{{ audioError }}</p>
    <audio ref="audio" :src="audioUrl" preload="metadata" @timeupdate="checkSegmentEnd" @ended="stopAudio" @error="onAudioError" />
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { segmentDuration, segmentTime, validSegmentStart } from '@/types/productionTrackVideo'

const props = defineProps<{
  modelValue: number | string | null
  durationSeconds: number
  audioUrl: string
  disabled?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [value: number | string | null] }>()
const audio = ref<HTMLAudioElement | null>(null)
const playing = ref(false)
const audioError = ref<string | null>(null)
const valid = computed(() => validSegmentStart(props.modelValue, props.durationSeconds))
const maxStart = computed(() => Math.max(0, Math.ceil(props.durationSeconds * 100) / 100 - 0.01))
const clipDuration = computed(() => valid.value ? segmentDuration(props.durationSeconds, Number(props.modelValue)) : 0)
let playbackSequence = 0

function stopAudio(): void {
  playbackSequence += 1
  audio.value?.pause()
  playing.value = false
}

function updateStart(value: string | number | null): void {
  stopAudio()
  emit('update:modelValue', value)
}

function onAudioError(): void {
  stopAudio()
  audioError.value = 'The audio could not be played. You can still try generating the video.'
}

async function togglePlayback(): Promise<void> {
  const player = audio.value
  if (!player || !valid.value) return
  if (playing.value) {
    stopAudio()
    return
  }
  const requestSequence = ++playbackSequence
  audioError.value = null
  try {
    player.currentTime = Number(props.modelValue)
    await player.play()
    if (requestSequence !== playbackSequence) {
      player.pause()
      return
    }
    playing.value = true
  } catch {
    if (requestSequence === playbackSequence) onAudioError()
  }
}

function checkSegmentEnd(): void {
  if (audio.value && audio.value.currentTime >= Number(props.modelValue) + clipDuration.value) stopAudio()
}

watch(() => props.disabled, disabled => { if (disabled) stopAudio() })
watch(() => props.audioUrl, () => { stopAudio(); audioError.value = null })
onBeforeUnmount(stopAudio)
</script>

<style scoped>
.segment-heading, .segment-controls, .segment-scale { display: flex; align-items: center; gap: 16px; justify-content: space-between; }
.segment-heading h2 { font-size: 1.15rem; }
.segment-heading span, .segment-scale, .segment-picker p { color: rgba(var(--v-theme-on-surface), 0.6); font-size: 0.875rem; }
.segment-picker p { margin: 8px 0 18px; }
.segment-slider { width: 100%; height: 24px; accent-color: rgb(var(--v-theme-primary)); cursor: pointer; }
.segment-scale { margin: 3px 0 18px; font-variant-numeric: tabular-nums; }
.segment-controls { flex-wrap: wrap; }
.segment-controls :deep(.v-input) { flex: 0 1 170px; min-width: 130px; }
.segment-window { font-size: 0.875rem; font-variant-numeric: tabular-nums; }
.segment-picker .segment-error { color: rgb(var(--v-theme-error)); margin-bottom: 0; }
@media (max-width: 620px) { .segment-controls .v-btn { width: 100%; } }
</style>
