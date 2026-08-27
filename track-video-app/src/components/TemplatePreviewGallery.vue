<template>
  <section class="selected-template" aria-live="polite">
    <div class="selected-template__copy">
      <span>Selected video template</span>
      <strong>{{ props.template.name }}</strong>
      <p>{{ props.template.description || 'Browse the previews and turn on sound to listen.' }}</p>
      <button
        v-if="selectedPreviewUrl"
        type="button"
        class="sound-toggle"
        :aria-pressed="previewMuted"
        @click="togglePreviewMuted"
      >
        <v-icon :icon="previewMuted ? 'mdi-volume-off' : 'mdi-volume-high'" size="17" />
        {{ previewMuted ? 'Sound off' : 'Sound on' }}
      </button>
    </div>

    <div
      class="preview-carousel"
      :class="{ 'preview-carousel--single': previewUrls.length <= 1 }"
    >
      <button
        v-if="previewUrls.length > 1"
        type="button"
        class="carousel-arrow"
        aria-label="Show previous preview"
        @click="showPreviousPreview"
      >
        <v-icon icon="mdi-chevron-left" size="27" />
      </button>

      <button
        v-if="previewUrls.length > 1"
        type="button"
        class="carousel-peek carousel-peek--previous"
        aria-label="Select previous preview"
        @click="showPreviousPreview"
      >
        <video :src="previousPreviewUrl" preload="metadata" muted playsinline></video>
      </button>

      <div class="selected-template__media">
        <video
          v-if="selectedPreviewUrl && !failedPreviews.has(selectedPreviewUrl)"
          ref="selectedVideo"
          :key="selectedPreviewUrl"
          :src="selectedPreviewUrl"
          :muted="previewMuted"
          :aria-label="`${props.template.name} selected video template preview`"
          class="selected-template__video"
          autoplay
          controls
          loop
          playsinline
          preload="metadata"
          @volumechange="syncPreviewMuted"
          @error="failedPreviews.add(selectedPreviewUrl)"
        ></video>
        <div v-else class="template-video-placeholder">
          <v-icon icon="mdi-video-off-outline" size="38" />
          <small>Preview unavailable</small>
        </div>
      </div>

      <button
        v-if="previewUrls.length > 1"
        type="button"
        class="carousel-peek carousel-peek--next"
        aria-label="Select next preview"
        @click="showNextPreview"
      >
        <video :src="nextPreviewUrl" preload="metadata" muted playsinline></video>
      </button>

      <button
        v-if="previewUrls.length > 1"
        type="button"
        class="carousel-arrow"
        aria-label="Show next preview"
        @click="showNextPreview"
      >
        <v-icon icon="mdi-chevron-right" size="27" />
      </button>
    </div>

    <slot name="preview-caption" :preview-url="selectedPreviewUrl" />
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import type { VideoTemplateCatalogueItem } from '@/types/trackVideo'
import { shuffled } from '@/utils/shuffle'

const props = defineProps<{
  template: VideoTemplateCatalogueItem & { description?: string }
  selectionRevision?: number
}>()

const previewUrls = ref<string[]>([])
const selectedPreviewIndex = ref(0)
const selectedPreviewUrl = computed(() => (
  previewUrls.value[selectedPreviewIndex.value] || null
))
const previousPreviewUrl = computed(() => {
  const previews = previewUrls.value
  return previews[(selectedPreviewIndex.value - 1 + previews.length) % previews.length]
})
const nextPreviewUrl = computed(() => {
  const previews = previewUrls.value
  return previews[(selectedPreviewIndex.value + 1) % previews.length]
})
const selectedVideo = ref<HTMLVideoElement | null>(null)
const previewMuted = ref(true)
const failedPreviews = reactive(new Set<string>())
const lastPreviewByTemplate = new Map<string, string>()
let activeTemplateId: string | null = null

function shufflePreviews(): void {
  if (activeTemplateId && selectedPreviewUrl.value) {
    lastPreviewByTemplate.set(activeTemplateId, selectedPreviewUrl.value)
  }

  const previews = shuffled(props.template.exampleVideoUrls)
  if (previews.length > 1 && previews[0] === lastPreviewByTemplate.get(props.template.id)) {
    const replacementIndex = 1 + Math.floor(Math.random() * (previews.length - 1))
    const firstPreview = previews[0]
    previews[0] = previews[replacementIndex]
    previews[replacementIndex] = firstPreview
  }

  previewUrls.value = previews
  selectedPreviewIndex.value = 0
  activeTemplateId = props.template.id
}

async function playSelectedPreview(): Promise<void> {
  await nextTick()
  const playRequest = selectedVideo.value?.play()
  await playRequest?.catch(() => undefined)
}

function showPreviousPreview(): void {
  const count = previewUrls.value.length
  selectedPreviewIndex.value = (selectedPreviewIndex.value - 1 + count) % count
}

function showNextPreview(): void {
  const count = previewUrls.value.length
  selectedPreviewIndex.value = (selectedPreviewIndex.value + 1) % count
}

function togglePreviewMuted(): void {
  previewMuted.value = !previewMuted.value
  if (!previewMuted.value) {
    void playSelectedPreview()
  }
}

function syncPreviewMuted(event: Event): void {
  previewMuted.value = (event.currentTarget as HTMLVideoElement).muted
}

watch([
  () => props.template.id,
  () => props.template.exampleVideoUrls,
  () => props.selectionRevision,
], shufflePreviews, { immediate: true })

watch(selectedVideo, (video, previousVideo) => {
  previousVideo?.pause()
  if (video) {
    void playSelectedPreview()
  }
}, { flush: 'post' })

onBeforeUnmount(() => selectedVideo.value?.pause())
</script>

<style scoped>
.selected-template {
  display: flex;
  gap: 24px;
  align-items: center;
  flex-direction: column;
  padding: 24px 20px 28px;
  background:
    radial-gradient(circle at 0 0, rgba(var(--v-theme-primary), 0.16), transparent 48%),
    rgba(var(--v-theme-on-surface), 0.035);
  border: 1px solid rgba(var(--v-theme-primary), 0.22);
  border-radius: 18px;
}

.selected-template__media {
  overflow: hidden;
  width: 100%;
  aspect-ratio: 9 / 16;
  background: #101116;
  border-radius: 14px;
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.38);
}

.selected-template__video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.template-video-placeholder {
  display: grid;
  width: 100%;
  height: 100%;
  place-content: center;
  justify-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.45);
  background: #101116;
}

.selected-template__copy {
  display: flex;
  align-items: center;
  flex-direction: column;
  text-align: center;
}

.selected-template__copy > span {
  color: rgb(var(--v-theme-primary));
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.selected-template__copy strong {
  margin-top: 5px;
  font-size: clamp(1.35rem, 2vw, 2rem);
  letter-spacing: -0.045em;
}

.selected-template__copy p {
  max-width: 560px;
  margin: 8px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.82rem;
  line-height: 1.55;
}

.sound-toggle {
  display: flex;
  gap: 7px;
  align-items: center;
  margin-top: 14px;
  padding: 7px 11px;
  color: rgba(var(--v-theme-on-surface), 0.72);
  font: inherit;
  font-size: 0.7rem;
  font-weight: 720;
  background: rgba(var(--v-theme-on-surface), 0.06);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 99px;
  cursor: pointer;
}

.sound-toggle:hover,
.sound-toggle:focus-visible {
  color: rgb(var(--v-theme-primary));
  border-color: rgba(var(--v-theme-primary), 0.42);
  outline: none;
}

.preview-carousel {
  display: grid;
  grid-template-columns: 42px 88px minmax(180px, 224px) 88px 42px;
  gap: 10px;
  align-items: center;
  justify-content: center;
  width: min(100%, 680px);
}

.preview-carousel--single {
  grid-template-columns: minmax(180px, 224px);
}

.carousel-arrow {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  padding: 0;
  color: rgba(var(--v-theme-on-surface), 0.72);
  background: rgba(var(--v-theme-on-surface), 0.065);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 50%;
  cursor: pointer;
  transition:
    background 160ms ease,
    transform 160ms ease;
}

.carousel-arrow:hover,
.carousel-arrow:focus-visible {
  color: rgb(var(--v-theme-on-primary));
  background: rgb(var(--v-theme-primary));
  outline: none;
  transform: scale(1.06);
}

.carousel-peek {
  width: 88px;
  aspect-ratio: 9 / 16;
  padding: 0;
  overflow: hidden;
  background: #101116;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 12px;
  cursor: pointer;
  opacity: 0.38;
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.carousel-peek--previous {
  transform: perspective(400px) rotateY(9deg) scale(0.88);
}

.carousel-peek--next {
  transform: perspective(400px) rotateY(-9deg) scale(0.88);
}

.carousel-peek:hover,
.carousel-peek:focus-visible {
  border-color: rgba(var(--v-theme-primary), 0.55);
  outline: none;
  opacity: 0.72;
}

.carousel-peek--previous:hover,
.carousel-peek--previous:focus-visible {
  transform: perspective(400px) rotateY(5deg) scale(0.94);
}

.carousel-peek--next:hover,
.carousel-peek--next:focus-visible {
  transform: perspective(400px) rotateY(-5deg) scale(0.94);
}

.carousel-peek video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media (max-width: 620px) {
  .selected-template {
    gap: 18px;
    padding: 20px 12px 24px;
  }

  .preview-carousel {
    grid-template-columns: 42px minmax(145px, 210px) 42px;
    gap: 8px;
  }

  .preview-carousel--single {
    grid-template-columns: minmax(145px, 210px);
  }

  .carousel-peek {
    display: none;
  }

}
</style>
