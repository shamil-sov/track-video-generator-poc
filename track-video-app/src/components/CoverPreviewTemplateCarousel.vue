<template>
  <section class="preview-picker" aria-labelledby="preview-template-heading">
    <div class="preview-heading">
      <div>
        <span>Selected template</span>
        <h2 id="preview-template-heading">{{ selectedTemplate?.name || 'Video template' }}</h2>
      </div>
      <span v-if="props.preview" class="render-time">
        Preview generated in {{ formatDuration(props.preview.totalDurationMs) }}
      </span>
    </div>

    <div class="preview-stage">
      <button
        type="button"
        class="carousel-arrow"
        aria-label="Select previous video template"
        :disabled="props.templates.length < 2"
        @click="selectAdjacent(-1)"
      >
        <v-icon icon="mdi-chevron-left" size="28" />
      </button>

      <div class="preview-media" :aria-busy="props.loading">
        <video
          v-if="props.preview && !props.loading"
          :key="props.preview.videoUrl"
          :src="props.preview.videoUrl"
          :aria-label="`${selectedTemplate?.name || 'Template'} preview using ${props.trackName}`"
          autoplay
          controls
          loop
          muted
          playsinline
        ></video>
        <div v-else class="preview-placeholder">
          <div class="preview-placeholder__status">
            <v-progress-circular v-if="props.loading" indeterminate color="primary" size="34" />
            <v-icon v-else icon="mdi-video-outline" size="34" />
            <strong>{{ props.loading ? 'Generating preview…' : 'Preview unavailable' }}</strong>
          </div>
        </div>
      </div>

      <button
        type="button"
        class="carousel-arrow"
        aria-label="Select next video template"
        :disabled="props.loading || props.templates.length < 2"
        @click="selectAdjacent(1)"
      >
        <v-icon icon="mdi-chevron-right" size="28" />
      </button>
    </div>

    <p v-if="props.error" class="preview-error" role="alert">
      <v-icon icon="mdi-alert-circle-outline" size="18" />
      {{ props.error }}
    </p>

    <div class="template-strip" role="radiogroup" aria-label="Cover video template">
      <button
        v-for="template in props.templates"
        :key="template.id"
        type="button"
        class="template-option"
        :class="{ 'template-option--selected': template.id === props.selectedTemplateId }"
        role="radio"
        :aria-checked="template.id === props.selectedTemplateId"
        @click="emit('select', template.id)"
        @keydown.left.prevent="selectAdjacentFrom(template.id, -1)"
        @keydown.right.prevent="selectAdjacentFrom(template.id, 1)"
      >
        <video
          v-if="template.exampleVideoUrls[0] && !failedExamples.has(template.id)"
          :src="template.exampleVideoUrls[0]"
          :aria-label="`${template.name} example`"
          muted
          playsinline
          preload="metadata"
          @error="failedExamples.add(template.id)"
        ></video>
        <span v-else class="template-option__fallback">
          <v-icon icon="mdi-video-off-outline" size="25" />
        </span>
        <span class="template-option__shade"></span>
        <span class="template-option__name">{{ template.name }}</span>
        <v-icon
          class="template-option__check"
          :icon="template.id === props.selectedTemplateId ? 'mdi-check-circle' : 'mdi-circle-outline'"
          size="20"
        />
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import type {
  CoverVideoPreview,
  TrackVideoTemplate,
  VideoTemplateCatalogueItem,
} from '@/types/trackVideo'
import { formatDuration } from '@/utils/formatters'

const props = defineProps<{
  templates: VideoTemplateCatalogueItem[]
  selectedTemplateId: TrackVideoTemplate
  trackName: string
  coverUrl: string
  preview: CoverVideoPreview | null
  loading: boolean
  error: string | null
}>()

const emit = defineEmits<{
  select: [templateId: TrackVideoTemplate]
}>()

const failedExamples = reactive(new Set<string>())
const selectedTemplate = computed(() => (
  props.templates.find(template => template.id === props.selectedTemplateId)
  || props.templates[0]
))

function selectAdjacent(offset: number): void {
  selectAdjacentFrom(selectedTemplate.value?.id || '', offset)
}

function selectAdjacentFrom(templateId: string, offset: number): void {
  const currentIndex = props.templates.findIndex(template => template.id === templateId)
  if (currentIndex < 0 || props.templates.length < 2) {
    return
  }

  const nextIndex = (currentIndex + offset + props.templates.length) % props.templates.length
  emit('select', props.templates[nextIndex].id)
}
</script>

<style scoped>
.preview-picker {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.preview-heading {
  display: flex;
  gap: 16px;
  align-items: flex-end;
  justify-content: space-between;
}

.preview-heading span:first-child {
  color: rgb(var(--v-theme-primary));
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.preview-heading h2 {
  margin: 4px 0 0;
  font-size: clamp(1.35rem, 2vw, 1.8rem);
  letter-spacing: -0.04em;
}

.render-time {
  color: rgba(var(--v-theme-on-surface), 0.56);
  font-size: 0.72rem;
}

.preview-stage {
  display: grid;
  grid-template-columns: 44px minmax(180px, 224px) 44px;
  gap: 12px;
  align-items: center;
  justify-content: center;
}

.carousel-arrow {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  padding: 0;
  color: rgba(var(--v-theme-on-surface), 0.76);
  background: rgba(var(--v-theme-on-surface), 0.065);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 50%;
  cursor: pointer;
}

.carousel-arrow:hover:not(:disabled),
.carousel-arrow:focus-visible {
  color: rgb(var(--v-theme-on-primary));
  background: rgb(var(--v-theme-primary));
  outline: none;
}

.carousel-arrow:disabled {
  cursor: default;
  opacity: 0.34;
}

.preview-media {
  width: 100%;
  aspect-ratio: 9 / 16;
  overflow: hidden;
  background: #0d0e12;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 16px;
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.42);
}

.preview-media video,
.preview-placeholder {
  width: 100%;
  height: 100%;
}

.preview-media video {
  display: block;
  object-fit: cover;
}

.preview-placeholder {
  position: relative;
  background:
    radial-gradient(circle at 50% 42%, rgba(var(--v-theme-primary), 0.1), transparent 42%),
    #0d0e12;
}

.preview-placeholder__status {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 10px;
  color: rgba(var(--v-theme-on-surface), 0.78);
  font-size: 0.74rem;
}

.preview-error {
  display: flex;
  gap: 7px;
  align-items: center;
  justify-content: center;
  margin: -6px 0 0;
  color: rgb(var(--v-theme-error));
  font-size: 0.75rem;
}

.template-strip {
  display: grid;
  grid-auto-columns: 92px;
  grid-auto-flow: column;
  gap: 10px;
  overflow-x: auto;
  padding: 4px 3px 12px;
  scrollbar-color: rgba(var(--v-theme-on-surface), 0.24) transparent;
}

.template-option {
  position: relative;
  aspect-ratio: 9 / 16;
  padding: 0;
  overflow: hidden;
  color: white;
  background: #121319;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 12px;
  cursor: pointer;
  transition: 160ms ease;
}

.template-option:hover:not(:disabled),
.template-option:focus-visible {
  border-color: rgba(var(--v-theme-on-surface), 0.38);
  outline: none;
  transform: translateY(-2px);
}

.template-option--selected {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.22);
}

.template-option video,
.template-option__fallback {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  object-fit: cover;
}

.template-option__fallback {
  color: rgba(var(--v-theme-on-surface), 0.4);
}

.template-option__shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, transparent 48%, rgba(5, 6, 8, 0.94));
}

.template-option__name {
  position: absolute;
  right: 8px;
  bottom: 8px;
  left: 8px;
  overflow: hidden;
  font-size: 0.65rem;
  font-weight: 760;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-option__check {
  position: absolute;
  top: 7px;
  right: 7px;
  color: rgb(var(--v-theme-primary));
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.7));
}

@media (max-width: 620px) {
  .preview-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .preview-stage {
    grid-template-columns: 40px minmax(160px, 210px) 40px;
    gap: 8px;
  }

  .carousel-arrow {
    width: 40px;
    height: 40px;
  }
}
</style>
