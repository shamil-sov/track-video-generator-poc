<template>
  <div class="template-picker">
    <section class="selected-template" aria-live="polite">
      <div class="selected-template__media">
        <video
          :src="templateVideos[selectedTemplate.value]"
          :poster="templateImages[selectedTemplate.value]"
          :aria-label="`${selectedTemplate.label} selected video template preview`"
          class="selected-template__video"
          autoplay
          loop
          muted
          playsinline
          preload="metadata"
        ></video>
      </div>

      <div class="selected-template__copy">
        <span>Selected video template</span>
        <strong>{{ selectedTemplate.label }}</strong>
        <p>{{ selectedTemplate.description }}</p>
        <small>
          <v-icon icon="mdi-play-circle-outline" size="16" />
          Live motion preview
        </small>
      </div>
    </section>

    <div class="template-options-heading">
      <strong>Choose a video template</strong>
      <span>{{ VIDEO_TEMPLATES.length }} templates</span>
    </div>

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

        <span class="template-shade"></span>
        <span class="template-name">{{ template.label }}</span>
        <span class="template-check">
          <v-icon
            :icon="model === template.value ? 'mdi-check-circle' : 'mdi-circle-outline'"
            size="21"
          />
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import musicVisualizerThumbnail from '@/assets/templates/music-visualizer.jpg'
import musicVisualizerVideo from '@/assets/templates/music-visualizer-preview.mp4'
import orbitThumbnail from '@/assets/templates/orbit.jpg'
import orbitVideo from '@/assets/templates/orbit-preview.mp4'
import prismThumbnail from '@/assets/templates/prism-spectrum.jpg'
import prismVideo from '@/assets/templates/prism-spectrum-preview.mp4'
import threeDimensionalThumbnail from '@/assets/templates/3d-style.jpg'
import threeDimensionalVideo from '@/assets/templates/3d-style-preview.mp4'
import vinylOrbitThumbnail from '@/assets/templates/vinyl-orbit.jpg'
import vinylOrbitVideo from '@/assets/templates/vinyl-orbit-preview.mp4'
import vinylSleeveThumbnail from '@/assets/templates/vinyl-sleeve.jpg'
import vinylSleeveVideo from '@/assets/templates/vinyl-sleeve-preview.mp4'
import { VIDEO_TEMPLATES, type TrackVideoTemplate } from '@/types/trackVideo'

const model = defineModel<TrackVideoTemplate>({ required: true })
const selectedTemplate = computed(() => (
  VIDEO_TEMPLATES.find(template => template.value === model.value) || VIDEO_TEMPLATES[0]
))

const templateImages: Record<TrackVideoTemplate, string> = {
  orbit: orbitThumbnail,
  'prism-spectrum': prismThumbnail,
  '3d-style': threeDimensionalThumbnail,
  'music-visualizer': musicVisualizerThumbnail,
  'vinyl-orbit': vinylOrbitThumbnail,
  'vinyl-sleeve': vinylSleeveThumbnail,
}

const templateVideos: Record<TrackVideoTemplate, string> = {
  orbit: orbitVideo,
  'prism-spectrum': prismVideo,
  '3d-style': threeDimensionalVideo,
  'music-visualizer': musicVisualizerVideo,
  'vinyl-orbit': vinylOrbitVideo,
  'vinyl-sleeve': vinylSleeveVideo,
}
</script>

<style scoped>
.template-picker {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.selected-template {
  display: grid;
  grid-template-columns: 210px minmax(0, 1fr);
  gap: 26px;
  align-items: center;
  padding: 16px;
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

.selected-template__copy {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
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

.selected-template__copy small {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-top: 20px;
  color: rgba(var(--v-theme-on-surface), 0.45);
  font-size: 0.7rem;
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
    grid-template-columns: 125px minmax(0, 1fr);
    gap: 16px;
  }

  .selected-template__copy p {
    display: none;
  }

  .template-grid {
    grid-template-columns: repeat(2, minmax(110px, 1fr));
  }
}
</style>
