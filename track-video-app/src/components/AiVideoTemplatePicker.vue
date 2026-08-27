<template>
  <div class="template-picker">
    <TemplatePreviewGallery v-if="selectedTemplate" :template="selectedTemplate" />

    <div class="template-grid" role="radiogroup" aria-label="AI-image video template">
      <button
        v-for="template in previewTemplates"
        :key="template.id"
        type="button"
        class="template-card"
        :class="{ 'template-card--selected': model === template.id }"
        role="radio"
        :aria-checked="model === template.id"
        :tabindex="model === template.id ? 0 : -1"
        :ref="element => setButtonElement(template.id, element)"
        @click="model = template.id"
        @keydown.left.prevent="selectAdjacentTemplate(template.id, -1)"
        @keydown.up.prevent="selectAdjacentTemplate(template.id, -1)"
        @keydown.right.prevent="selectAdjacentTemplate(template.id, 1)"
        @keydown.down.prevent="selectAdjacentTemplate(template.id, 1)"
      >
        <video
          v-if="!failedPreviews.has(template.exampleVideoUrls[0])"
          :src="template.exampleVideoUrls[0]"
          :aria-label="`${template.name} video example`"
          class="template-preview"
          muted
          playsinline
          preload="metadata"
          @error="failedPreviews.add(template.exampleVideoUrls[0])"
        ></video>
        <span v-else class="template-preview template-preview--unavailable">
          <v-icon icon="mdi-video-off-outline" size="28" />
          <small>Unavailable</small>
        </span>

        <span class="template-copy">
          <span class="template-name">{{ template.name }}</span>
          <span class="template-description">{{ template.description }}</span>
        </span>

        <span class="template-check">
          <v-icon
            :icon="model === template.id ? 'mdi-check-circle' : 'mdi-circle-outline'"
            size="20"
          />
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import TemplatePreviewGallery from '@/components/TemplatePreviewGallery.vue'
import type { AiImageVideoTemplate } from '@/types/aiImageTrackVideo'

const props = defineProps<{
  templates: AiImageVideoTemplate[]
}>()

const model = defineModel<string | null>({ required: true })
const previewTemplates = computed(() => props.templates.map(template => ({
  ...template,
  // Older catalogue responses contain only the canonical preview.
  exampleVideoUrls: template.exampleVideoUrls?.length
    ? template.exampleVideoUrls
    : [template.exampleVideoUrl],
})))
const selectedTemplate = computed(() => (
  previewTemplates.value.find(template => template.id === model.value) || null
))
const buttonElements = new Map<string, HTMLButtonElement>()
const failedPreviews = reactive(new Set<string>())

watch(() => props.templates, templates => {
  if (!model.value && templates.length) {
    model.value = templates[0].id
  }
}, { immediate: true })

function setButtonElement(
  id: string,
  element: Element | ComponentPublicInstance | null,
): void {
  if (element instanceof HTMLButtonElement) {
    buttonElements.set(id, element)
  } else {
    buttonElements.delete(id)
  }
}

function selectAdjacentTemplate(id: string, offset: number): void {
  const ids = [...buttonElements.keys()]
  const currentIndex = ids.indexOf(id)
  const nextId = ids[(currentIndex + offset + ids.length) % ids.length]
  if (!nextId) {
    return
  }

  model.value = nextId
  void nextTick(() => buttonElements.get(nextId)?.focus())
}
</script>

<style scoped>
.template-picker {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.template-card {
  position: relative;
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) 18px;
  gap: 10px;
  align-items: center;
  min-width: 0;
  min-height: 150px;
  padding: 10px;
  color: rgb(var(--v-theme-on-surface));
  text-align: left;
  background: rgba(var(--v-theme-surface), 0.72);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 18px;
  cursor: pointer;
  transition: 180ms ease;
}

.template-card:hover,
.template-card:focus-visible {
  border-color: rgba(var(--v-theme-on-surface), 0.28);
  outline: none;
  transform: translateY(-2px);
}

.template-card--selected {
  background: rgba(var(--v-theme-primary), 0.1);
  border-color: rgb(var(--v-theme-primary));
  box-shadow: inset 0 0 0 1px rgb(var(--v-theme-primary));
}

.template-preview {
  display: block;
  width: 72px;
  aspect-ratio: 9 / 16;
  object-fit: cover;
  object-position: center;
  background: #101116;
  border-radius: 14px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.34);
}

.template-preview--unavailable {
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: rgba(var(--v-theme-on-surface), 0.45);
}

.template-preview--unavailable small {
  font-size: 0.55rem;
}

.template-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.template-name {
  margin-bottom: 5px;
  font-size: 0.84rem;
  font-weight: 750;
}

.template-description {
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.68rem;
  line-height: 1.35;
}

.template-check {
  color: rgb(var(--v-theme-primary));
}

@media (max-width: 1080px) {
  .template-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .template-grid {
    grid-template-columns: 1fr;
  }
}
</style>
