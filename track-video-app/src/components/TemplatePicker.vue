<template>
  <div class="template-grid" role="radiogroup" aria-label="Video style">
    <button
      v-for="template in VIDEO_TEMPLATES"
      :key="template.value"
      type="button"
      class="template-card"
      :class="[
        `template-card--${template.value}`,
        { 'template-card--selected': model === template.value },
      ]"
      role="radio"
      :aria-checked="model === template.value"
      @click="model = template.value"
    >
      <video
        v-if="templateVideos[template.value]"
        :src="templateVideos[template.value]"
        :poster="templateImages[template.value]"
        :aria-label="`${template.label} video example`"
        class="template-preview"
        autoplay
        loop
        muted
        playsinline
        preload="metadata"
      ></video>
      <span
        v-else
        class="template-preview template-preview--placeholder"
        :class="`template-preview--${template.value}`"
        aria-hidden="true"
      >
        <v-icon :icon="template.icon" size="34" />
      </span>

      <span class="template-copy">
        <span class="template-name">{{ template.label }}</span>
        <span class="template-description">{{ template.description }}</span>
      </span>

      <span class="template-check">
        <v-icon
          :icon="model === template.value ? 'mdi-check-circle' : 'mdi-circle-outline'"
          size="20"
        />
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import orbitThumbnail from '@/assets/templates/orbit.jpg'
import orbitVideo from '@/assets/templates/orbit-preview.mp4'
import prismThumbnail from '@/assets/templates/prism-spectrum.jpg'
import prismVideo from '@/assets/templates/prism-spectrum-preview.mp4'
import threeDimensionalThumbnail from '@/assets/templates/3d-style.jpg'
import threeDimensionalVideo from '@/assets/templates/3d-style-preview.mp4'
import { VIDEO_TEMPLATES, type TrackVideoTemplate } from '@/types/trackVideo'

const model = defineModel<TrackVideoTemplate>({ required: true })

const templateImages: Partial<Record<TrackVideoTemplate, string>> = {
  orbit: orbitThumbnail,
  'prism-spectrum': prismThumbnail,
  '3d-style': threeDimensionalThumbnail,
}

const templateVideos: Partial<Record<TrackVideoTemplate, string>> = {
  orbit: orbitVideo,
  'prism-spectrum': prismVideo,
  '3d-style': threeDimensionalVideo,
}
</script>

<style scoped>
.template-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.template-card {
  position: relative;
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr) 20px;
  gap: 14px;
  align-items: center;
  min-width: 0;
  min-height: 178px;
  padding: 12px;
  color: rgb(var(--v-theme-on-surface));
  text-align: left;
  background: rgba(var(--v-theme-surface), 0.72);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 18px;
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
  background: rgba(var(--v-theme-primary), 0.1);
  border-color: rgb(var(--v-theme-primary));
  box-shadow: inset 0 0 0 1px rgb(var(--v-theme-primary));
}

.template-preview {
  display: block;
  width: 90px;
  aspect-ratio: 9 / 15;
  object-fit: cover;
  object-position: center;
  border-radius: 14px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.34);
}

.template-preview--placeholder {
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.9);
  background:
    radial-gradient(circle at 50% 42%, rgba(72, 215, 255, 0.42), transparent 22%),
    repeating-linear-gradient(90deg, transparent 0 8px, rgba(72, 215, 255, 0.13) 8px 10px),
    #101a24;
}

.template-preview--vinyl-orbit {
  background:
    radial-gradient(circle, #ffac5f 0 5%, #19191d 6% 23%, #34343b 24% 25%, #131316 26% 40%, #2a2a30 41% 42%, #111114 43% 58%, transparent 59%),
    radial-gradient(circle at 50% 50%, rgba(255, 172, 95, 0.36), transparent 68%),
    #221813;
}

.template-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.template-name {
  margin-bottom: 5px;
  font-size: 0.92rem;
  font-weight: 750;
}

.template-description {
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.76rem;
  line-height: 1.4;
}

.template-check {
  color: rgb(var(--v-theme-primary));
}

@media (max-width: 1000px) {
  .template-grid {
    grid-template-columns: 1fr;
  }
}
</style>
