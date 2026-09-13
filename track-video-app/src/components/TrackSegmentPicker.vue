<template>
  <section class="segment-picker" aria-labelledby="segment-heading">
    <div class="segment-heading">
      <h2 id="segment-heading">Choose a 15-second segment</h2>
      <span v-if="valid" class="segment-duration" aria-live="polite">{{ durationLabel }} seconds selected</span>
    </div>
    <p id="segment-help">Move the start point. The highlighted segment becomes your video — up to <strong>15 seconds</strong>.</p>
    <input
      class="segment-slider"
      type="range"
      aria-label="Segment start position"
      aria-describedby="segment-help"
      :aria-valuetext="valid ? `${segmentTime(Number(modelValue))} to ${segmentTime(Number(modelValue) + clipDuration)}, ${durationLabel} seconds` : undefined"
      min="0"
      :max="maxStart"
      step="0.01"
      :value="valid ? Number(modelValue) : 0"
      :style="timelineStyle"
      :disabled="disabled"
      @input="updateStart(($event.target as HTMLInputElement).value)"
    />
    <div class="segment-scale"><span>0:00</span><span>{{ segmentTime(durationSeconds) }}</span></div>
    <p v-if="valid && clipDuration < 15" class="segment-short-note" role="status">
      Only {{ durationLabel }} seconds remain. Your video will be shorter than 15 seconds.
    </p>
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
const durationLabel = computed(() => clipDuration.value.toFixed(2).replace(/\.00$/, ''))
const timelineStyle = computed(() => ({
  '--segment-start': `${valid.value ? Number(props.modelValue) / props.durationSeconds * 100 : 0}%`,
  '--segment-end': `${valid.value ? (Number(props.modelValue) + clipDuration.value) / props.durationSeconds * 100 : 0}%`,
}))
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
.segment-heading { flex-wrap: wrap; gap: 10px; }
.segment-scale, .segment-picker p { color: rgba(var(--v-theme-on-surface), 0.6); font-size: 0.875rem; }
.segment-duration { padding: 6px 12px; border-radius: 999px; background: rgba(var(--v-theme-primary), .15); color: rgb(var(--v-theme-primary)); font-size: .875rem; font-weight: 700; white-space: nowrap; }
.segment-picker p { margin: 8px 0 18px; }
.segment-picker .segment-short-note { color: rgb(var(--v-theme-on-surface)); margin-top: -6px; }
.segment-slider { appearance: none; width: 100%; height: 28px; cursor: pointer; background: transparent; --timeline-background: linear-gradient(to right, rgba(var(--v-theme-on-surface), .18) 0% var(--segment-start), rgb(var(--v-theme-primary)) var(--segment-start) var(--segment-end), rgba(var(--v-theme-on-surface), .18) var(--segment-end) 100%); }
.segment-slider::-webkit-slider-runnable-track { height: 8px; border-radius: 4px; background: var(--timeline-background); }
.segment-slider::-moz-range-track { height: 8px; border-radius: 4px; background: var(--timeline-background); }
.segment-slider::-webkit-slider-thumb { appearance: none; width: 20px; height: 20px; margin-top: -6px; border: 3px solid rgb(var(--v-theme-primary)); border-radius: 50%; background: rgb(var(--v-theme-surface)); }
.segment-slider::-moz-range-thumb { box-sizing: border-box; width: 20px; height: 20px; border: 3px solid rgb(var(--v-theme-primary)); border-radius: 50%; background: rgb(var(--v-theme-surface)); }
.segment-slider:focus-visible { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: 3px; border-radius: 4px; }
.segment-slider:disabled { opacity: .45; cursor: default; }
.segment-scale { margin: 3px 0 18px; font-variant-numeric: tabular-nums; }
.segment-controls { flex-wrap: wrap; }
.segment-controls :deep(.v-input) { flex: 0 1 170px; min-width: 130px; }
.segment-window { font-size: 0.875rem; font-variant-numeric: tabular-nums; }
.segment-picker .segment-error { color: rgb(var(--v-theme-error)); margin-bottom: 0; }
@media (max-width: 620px) { .segment-controls .v-btn { width: 100%; } }
</style>
