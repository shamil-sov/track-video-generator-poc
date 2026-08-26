<template>
  <div class="template-picker">
    <section class="selected-template" aria-live="polite">
      <div class="selected-template__media">
        <video
          v-if="selectedPreviewUrl"
          :key="selectedPreviewUrl"
          :src="selectedPreviewUrl"
          :aria-label="`${selectedTemplate.name} selected video template preview ${selectedPreviewIndex + 1}`"
          class="selected-template__video"
          autoplay
          loop
          muted
          playsinline
          preload="metadata"
        ></video>
        <div v-else class="template-video-placeholder">
          <v-icon icon="mdi-video-outline" size="38" />
        </div>
      </div>

      <div class="selected-template__copy">
        <span>Selected video template</span>
        <strong>{{ selectedTemplate.name }}</strong>
        <p>Preview this template across different tracks.</p>

        <div
          v-if="selectedTemplate.exampleVideoUrls.length > 1"
          class="example-switcher"
          role="group"
          :aria-label="`${selectedTemplate.name} examples`"
        >
          <button
            v-for="(_, index) in selectedTemplate.exampleVideoUrls"
            :key="index"
            type="button"
            class="example-button"
            :class="{ 'example-button--selected': selectedPreviewIndex === index }"
            :aria-pressed="selectedPreviewIndex === index"
            :aria-label="`Show example ${index + 1}`"
            @click="selectedPreviewIndex = index"
          >
            {{ index + 1 }}
          </button>
        </div>

        <small v-if="selectedTemplate.exampleVideoUrls.length">
          <v-icon icon="mdi-play-circle-outline" size="16" />
          Example {{ selectedPreviewIndex + 1 }} of {{ selectedTemplate.exampleVideoUrls.length }}
        </small>
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
          autoplay
          loop
          muted
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
import { computed, ref, watch } from 'vue'
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

watch(model, () => {
  selectedPreviewIndex.value = 0
})
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

.example-switcher {
  display: flex;
  gap: 7px;
  margin-top: 18px;
}

.example-button {
  display: grid;
  width: 34px;
  height: 30px;
  place-items: center;
  color: rgba(var(--v-theme-on-surface), 0.55);
  font: inherit;
  font-size: 0.72rem;
  font-weight: 760;
  background: rgba(var(--v-theme-on-surface), 0.06);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.09);
  border-radius: 9px;
  cursor: pointer;
}

.example-button:hover,
.example-button:focus-visible,
.example-button--selected {
  color: rgb(var(--v-theme-on-primary));
  background: rgb(var(--v-theme-primary));
  border-color: rgb(var(--v-theme-primary));
  outline: none;
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
