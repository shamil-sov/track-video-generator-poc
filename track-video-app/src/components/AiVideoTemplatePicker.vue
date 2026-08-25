<template>
  <div class="template-picker">
    <section v-if="selectedTemplate" class="selected-template" aria-live="polite">
      <div class="selected-template__media">
        <video
          v-if="!failedPreviews.has(selectedTemplate.id)"
          :src="selectedTemplate.exampleVideoUrl"
          :aria-label="`${selectedTemplate.name} selected video template preview`"
          class="selected-template__video"
          autoplay
          loop
          muted
          playsinline
          preload="metadata"
          @error="failedPreviews.add(selectedTemplate.id)"
        ></video>
        <span v-else class="selected-template__video template-preview--unavailable">
          <v-icon icon="mdi-video-off-outline" size="38" />
          <small>Preview unavailable</small>
        </span>
      </div>

      <div class="selected-template__copy">
        <span>Selected video template</span>
        <strong>{{ selectedTemplate.name }}</strong>
        <p>{{ selectedTemplate.description }}</p>
        <small>
          <v-icon icon="mdi-play-circle-outline" size="16" />
          Live motion preview
        </small>
      </div>
    </section>

    <div class="template-grid" role="radiogroup" aria-label="AI-image video template">
      <button
        v-for="template in templates"
        :key="template.id"
        type="button"
        class="template-card"
        :class="{ 'template-card--selected': model === template.id }"
        role="radio"
        :aria-checked="model === template.id"
        :tabindex="model === template.id ? 0 : -1"
        :ref="element => setButtonElement(template.id, element)"
        @mouseenter="activePreview = template.id"
        @mouseleave="activePreview = null"
        @focus="activePreview = template.id"
        @blur="activePreview = null"
        @click="model = template.id"
        @keydown.left.prevent="selectAdjacentTemplate(template.id, -1)"
        @keydown.up.prevent="selectAdjacentTemplate(template.id, -1)"
        @keydown.right.prevent="selectAdjacentTemplate(template.id, 1)"
        @keydown.down.prevent="selectAdjacentTemplate(template.id, 1)"
      >
        <video
          v-if="!failedPreviews.has(template.id)"
          :ref="element => setVideoElement(template.id, element)"
          :src="template.exampleVideoUrl"
          :aria-label="`${template.name} video example`"
          class="template-preview"
          loop
          muted
          playsinline
          preload="metadata"
          @error="failedPreviews.add(template.id)"
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
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import type { AiImageVideoTemplate } from '@/types/aiImageTrackVideo'

const props = defineProps<{
  templates: AiImageVideoTemplate[]
}>()

const model = defineModel<string | null>({ required: true })
const selectedTemplate = computed(() => (
  props.templates.find(template => template.id === model.value) || null
))
const activePreview = ref<string | null>(null)
const videoElements = new Map<string, HTMLVideoElement>()
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

function setVideoElement(
  id: string,
  element: Element | ComponentPublicInstance | null,
): void {
  if (element instanceof HTMLVideoElement) {
    videoElements.set(id, element)
    void syncPlayback()
  } else {
    videoElements.delete(id)
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

async function syncPlayback(): Promise<void> {
  await nextTick()

  for (const [id, video] of videoElements) {
    if (id === model.value || id === activePreview.value) {
      await video.play().catch(() => undefined)
    } else {
      video.pause()
    }
  }
}

watch([model, activePreview], () => {
  void syncPlayback()
}, { immediate: true })

onBeforeUnmount(() => {
  for (const video of videoElements.values()) {
    video.pause()
  }
  videoElements.clear()
  buttonElements.clear()
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
  aspect-ratio: 9 / 15;
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
  .selected-template {
    grid-template-columns: 125px minmax(0, 1fr);
    gap: 16px;
  }

  .selected-template__copy p {
    display: none;
  }

  .template-grid {
    grid-template-columns: 1fr;
  }
}
</style>
