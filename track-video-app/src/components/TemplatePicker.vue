<template>
  <div class="template-picker">
    <section class="selected-template" aria-live="polite">
      <div class="selected-template__copy">
        <span>Selected video template</span>
        <strong>{{ selectedTemplate.name }}</strong>
        <p>Choose a track example, then play it with sound.</p>
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
        :class="{ 'preview-carousel--single': selectedTemplate.exampleVideoUrls.length <= 1 }"
      >
        <button
          v-if="selectedTemplate.exampleVideoUrls.length > 1"
          type="button"
          class="carousel-arrow"
          aria-label="Show previous preview"
          @click="showPreviousPreview"
        >
          <v-icon icon="mdi-chevron-left" size="27" />
        </button>

        <button
          v-if="selectedTemplate.exampleVideoUrls.length > 1"
          type="button"
          class="carousel-peek carousel-peek--previous"
          aria-label="Select previous preview"
          @click="showPreviousPreview"
        >
          <video :src="previousPreviewUrl" preload="metadata" playsinline></video>
        </button>

        <div class="selected-template__media">
          <video
            v-if="selectedPreviewUrl"
            ref="selectedVideo"
            :key="selectedPreviewUrl"
            :src="selectedPreviewUrl"
            :muted="previewMuted"
            :aria-label="`${selectedTemplate.name} selected video template preview`"
            class="selected-template__video"
            autoplay
            controls
            loop
            playsinline
            preload="metadata"
            @volumechange="syncPreviewMuted"
          ></video>
          <div v-else class="template-video-placeholder">
            <v-icon icon="mdi-video-outline" size="38" />
          </div>
        </div>

        <button
          v-if="selectedTemplate.exampleVideoUrls.length > 1"
          type="button"
          class="carousel-peek carousel-peek--next"
          aria-label="Select next preview"
          @click="showNextPreview"
        >
          <video :src="nextPreviewUrl" preload="metadata" playsinline></video>
        </button>

        <button
          v-if="selectedTemplate.exampleVideoUrls.length > 1"
          type="button"
          class="carousel-arrow"
          aria-label="Show next preview"
          @click="showNextPreview"
        >
          <v-icon icon="mdi-chevron-right" size="27" />
        </button>
      </div>
    </section>

    <div class="template-options-heading">
      <strong>Choose a video template</strong>
      <span>{{ props.templates.length }} templates</span>
    </div>

    <div class="template-grid" role="radiogroup" aria-label="Video style">
      <button
        v-for="template in props.templates"
        :key="template.id"
        type="button"
        class="template-card"
        :class="[
          `template-card--${template.id}`,
          { 'template-card--selected': model === template.id },
        ]"
        role="radio"
        :aria-checked="model === template.id"
        @click="model = template.id"
      >
        <video
          v-if="template.exampleVideoUrls[0]"
          :src="template.exampleVideoUrls[0]"
          :aria-label="`${template.name} video example`"
          class="template-preview"
          playsinline
          preload="metadata"
        ></video>
        <div v-else class="template-video-placeholder">
          <v-icon icon="mdi-video-outline" size="28" />
        </div>

        <span class="template-shade"></span>
        <span class="template-name">{{ template.name }}</span>
        <span class="template-check">
          <v-icon
            :icon="model === template.id ? 'mdi-check-circle' : 'mdi-circle-outline'"
            size="21"
          />
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { TrackVideoTemplate, VideoTemplateCatalogueItem } from '@/types/trackVideo'

const props = defineProps<{
  templates: VideoTemplateCatalogueItem[]
}>()
const model = defineModel<TrackVideoTemplate>({ required: true })
const selectedTemplate = computed(() => (
  props.templates.find(template => template.id === model.value) || props.templates[0]
))
const selectedPreviewIndex = ref(0)
const selectedPreviewUrl = computed(() => (
  selectedTemplate.value?.exampleVideoUrls[selectedPreviewIndex.value] || null
))
const previousPreviewUrl = computed(() => {
  const previews = selectedTemplate.value.exampleVideoUrls
  return previews[(selectedPreviewIndex.value - 1 + previews.length) % previews.length]
})
const nextPreviewUrl = computed(() => {
  const previews = selectedTemplate.value.exampleVideoUrls
  return previews[(selectedPreviewIndex.value + 1) % previews.length]
})
const selectedVideo = ref<HTMLVideoElement | null>(null)
const previewMuted = ref(false)

async function playSelectedPreview(): Promise<void> {
  await nextTick()
  const playRequest = selectedVideo.value?.play()
  await playRequest?.catch(() => undefined)
}

function showPreviousPreview(): void {
  const count = selectedTemplate.value.exampleVideoUrls.length
  selectedPreviewIndex.value = (selectedPreviewIndex.value - 1 + count) % count
  void playSelectedPreview()
}

function showNextPreview(): void {
  const count = selectedTemplate.value.exampleVideoUrls.length
  selectedPreviewIndex.value = (selectedPreviewIndex.value + 1) % count
  void playSelectedPreview()
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

watch(model, () => {
  selectedPreviewIndex.value = 0
  void playSelectedPreview()
})
</script>

<style scoped>
.template-picker {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.selected-template {
  display: flex;
  gap: 24px;
  align-items: center;
  flex-direction: column;
  padding: 24px 20px 28px;
  background:
    radial-gradient(circle at 0 0, rgba(127, 140, 255, 0.16), transparent 48%),
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
  place-items: center;
  color: rgba(255, 255, 255, 0.34);
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

.template-options-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-top: 2px;
}

.template-options-heading strong {
  font-size: 0.83rem;
}

.template-options-heading span {
  color: rgba(var(--v-theme-on-surface), 0.45);
  font-size: 0.7rem;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(110px, 150px));
  gap: 10px;
}

.template-card {
  position: relative;
  min-width: 0;
  aspect-ratio: 9 / 16;
  padding: 0;
  overflow: hidden;
  color: white;
  text-align: left;
  background: #15171c;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 14px;
  cursor: pointer;
  transition:
    border-color 180ms ease,
    background 180ms ease,
    transform 180ms ease;
}

.template-card:hover {
  border-color: rgba(var(--v-theme-on-surface), 0.25);
  transform: translateY(-2px);
}

.template-card--selected {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.22);
}

.template-preview {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.template-shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, transparent 50%, rgba(5, 6, 8, 0.92));
}

.template-name {
  position: absolute;
  right: 9px;
  bottom: 9px;
  left: 9px;
  overflow: hidden;
  font-size: 0.71rem;
  font-weight: 760;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-check {
  position: absolute;
  top: 8px;
  right: 8px;
  color: rgb(var(--v-theme-primary));
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6));
}

@media (max-width: 1100px) {
  .template-grid {
    grid-template-columns: repeat(3, minmax(110px, 150px));
  }
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

  .template-grid {
    grid-template-columns: repeat(2, minmax(110px, 1fr));
  }
}
</style>
