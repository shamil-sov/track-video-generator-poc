<template>
  <div class="template-picker">
    <TemplatePreviewGallery :template="selectedTemplate" />

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
import { computed } from 'vue'
import TemplatePreviewGallery from '@/components/TemplatePreviewGallery.vue'
import type { TrackVideoTemplate, VideoTemplateCatalogueItem } from '@/types/trackVideo'

const props = defineProps<{
  templates: VideoTemplateCatalogueItem[]
}>()
const model = defineModel<TrackVideoTemplate>({ required: true })
const selectedTemplate = computed(() => (
  props.templates.find(template => template.id === model.value) || props.templates[0]
))
</script>

<style scoped>
.template-picker {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.template-video-placeholder {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  color: rgba(255, 255, 255, 0.34);
  background: #101116;
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
  .template-grid {
    grid-template-columns: repeat(2, minmax(110px, 1fr));
  }
}
</style>
