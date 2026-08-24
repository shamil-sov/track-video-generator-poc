<template>
  <div class="style-picker">
    <section v-if="selectedStyle" class="selected-preview" aria-live="polite">
      <div class="selected-preview__media">
        <v-img
          v-if="activeImageUrl && !failedImages.has(activeImageUrl)"
          :src="activeImageUrl"
          :alt="`${selectedStyle.name} example ${activeImageIndex + 1}`"
          cover
          class="selected-preview__image"
          @error="failedImages.add(activeImageUrl)"
        />
        <div v-else class="image-placeholder">
          <v-icon icon="mdi-image-off-outline" size="42" />
          <span>No example available</span>
        </div>

        <template v-if="selectedImages.length > 1">
          <v-btn
            icon="mdi-chevron-left"
            variant="flat"
            size="small"
            class="gallery-arrow gallery-arrow--left"
            aria-label="Previous style example"
            @click="showPreviousImage"
          />
          <v-btn
            icon="mdi-chevron-right"
            variant="flat"
            size="small"
            class="gallery-arrow gallery-arrow--right"
            aria-label="Next style example"
            @click="showNextImage"
          />
        </template>
      </div>

      <div class="selected-preview__copy">
        <span>Selected visual style</span>
        <strong>{{ selectedStyle.name }}</strong>
        <small>
          {{ selectedImages.length }} reviewed
          {{ selectedImages.length === 1 ? 'example' : 'examples' }}
        </small>

        <div v-if="selectedImages.length > 1" class="gallery-progress">
          <button
            v-for="(_, index) in selectedImages"
            :key="index"
            type="button"
            :class="{ 'gallery-progress__dot--active': activeImageIndex === index }"
            :aria-label="`Show example ${index + 1}`"
            @click="activeImageIndex = index"
          ></button>
        </div>
      </div>
    </section>

    <div class="catalogue-heading">
      <div>
        <strong>Choose an image direction</strong>
        <span>{{ filteredStyles.length }} styles</span>
      </div>
      <v-text-field
        v-model="search"
        label="Search styles"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        density="compact"
        hide-details
        clearable
      />
    </div>

    <div
      v-if="filteredStyles.length"
      class="style-grid"
      role="radiogroup"
      aria-label="AI visual style"
    >
      <button
        v-for="style in filteredStyles"
        :key="style.id"
        type="button"
        class="style-card"
        :class="{ 'style-card--selected': model === style.id }"
        role="radio"
        :aria-checked="model === style.id"
        :tabindex="model === style.id ? 0 : -1"
        :ref="element => setStyleButton(style.id, element)"
        @click="model = style.id"
        @keydown.left.prevent="selectAdjacentStyle(style.id, -1)"
        @keydown.up.prevent="selectAdjacentStyle(style.id, -1)"
        @keydown.right.prevent="selectAdjacentStyle(style.id, 1)"
        @keydown.down.prevent="selectAdjacentStyle(style.id, 1)"
      >
        <v-img
          v-if="style.exampleImageUrls.length && !failedImages.has(style.exampleImageUrls[0])"
          :src="style.exampleImageUrls[0]"
          :alt="`${style.name} visual style example`"
          cover
          class="style-card__image"
          loading="lazy"
          @error="failedImages.add(style.exampleImageUrls[0])"
        />
        <div v-else class="style-card__image image-placeholder">
          <v-icon icon="mdi-image-off-outline" size="30" />
        </div>
        <span v-if="style.exampleImageUrls.length > 1" class="image-count">
          <v-icon icon="mdi-image-multiple-outline" size="13" />
          {{ style.exampleImageUrls.length }}
        </span>
        <span class="style-card__shade"></span>
        <span class="style-card__name">{{ style.name }}</span>
        <v-icon
          :icon="model === style.id ? 'mdi-check-circle' : 'mdi-circle-outline'"
          class="style-card__check"
          size="21"
        />
      </button>
    </div>

    <div v-else class="empty-search">
      <v-icon icon="mdi-image-search-outline" size="34" />
      <span>No visual styles match “{{ search }}”.</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import type { AiImageVisualStyle } from '@/types/aiImageTrackVideo'

const props = defineProps<{
  styles: AiImageVisualStyle[]
}>()

const model = defineModel<string | null>({ required: true })
const search = ref<string | null>('')
const activeImageIndex = ref(0)
const failedImages = reactive(new Set<string>())
const styleButtons = new Map<string, HTMLButtonElement>()

const selectedStyle = computed(() => props.styles.find(style => style.id === model.value) || null)
const selectedImages = computed(() => selectedStyle.value?.exampleImageUrls || [])
const activeImageUrl = computed(() => selectedImages.value[activeImageIndex.value] || null)
const filteredStyles = computed(() => {
  const query = (search.value || '').trim().toLowerCase()
  if (!query) {
    return props.styles
  }

  return props.styles.filter(style => style.name.toLowerCase().includes(query))
})

watch(model, () => {
  activeImageIndex.value = 0
})

function setStyleButton(
  id: string,
  element: Element | ComponentPublicInstance | null,
): void {
  if (element instanceof HTMLButtonElement) {
    styleButtons.set(id, element)
  } else {
    styleButtons.delete(id)
  }
}

function selectAdjacentStyle(id: string, offset: number): void {
  const ids = filteredStyles.value.map(style => style.id)
  const currentIndex = ids.indexOf(id)
  const nextId = ids[(currentIndex + offset + ids.length) % ids.length]
  if (!nextId) {
    return
  }

  model.value = nextId
  void nextTick(() => styleButtons.get(nextId)?.focus())
}

function showPreviousImage(): void {
  activeImageIndex.value = (
    activeImageIndex.value - 1 + selectedImages.value.length
  ) % selectedImages.value.length
}

function showNextImage(): void {
  activeImageIndex.value = (activeImageIndex.value + 1) % selectedImages.value.length
}
</script>

<style scoped>
.style-picker {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.selected-preview {
  display: grid;
  grid-template-columns: 190px minmax(0, 1fr);
  gap: 24px;
  align-items: center;
  padding: 16px;
  background:
    radial-gradient(circle at 0 0, rgba(127, 140, 255, 0.16), transparent 48%),
    rgba(var(--v-theme-on-surface), 0.035);
  border: 1px solid rgba(var(--v-theme-primary), 0.22);
  border-radius: 18px;
}

.selected-preview__media {
  position: relative;
  overflow: hidden;
  aspect-ratio: 9 / 16;
  background: #111319;
  border-radius: 14px;
}

.selected-preview__image {
  width: 100%;
  height: 100%;
}

.selected-preview__copy {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
}

.selected-preview__copy > span {
  color: rgb(var(--v-theme-primary));
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.selected-preview__copy strong {
  margin-top: 5px;
  font-size: clamp(1.35rem, 2vw, 2rem);
  letter-spacing: -0.045em;
}

.selected-preview__copy small {
  margin-top: 5px;
  color: rgba(var(--v-theme-on-surface), 0.48);
}

.gallery-arrow {
  position: absolute;
  top: 50%;
  color: white !important;
  background: rgba(10, 11, 14, 0.62) !important;
  transform: translateY(-50%);
  backdrop-filter: blur(8px);
}

.gallery-arrow--left {
  left: 7px;
}

.gallery-arrow--right {
  right: 7px;
}

.gallery-progress {
  display: flex;
  gap: 6px;
  margin-top: 20px;
}

.gallery-progress button {
  position: relative;
  width: 26px;
  height: 22px;
  padding: 0;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.gallery-progress button::after {
  position: absolute;
  top: 9px;
  right: 3px;
  left: 3px;
  height: 4px;
  content: '';
  background: rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 99px;
}

.gallery-progress .gallery-progress__dot--active::after {
  background: rgb(var(--v-theme-primary));
}

.catalogue-heading {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 320px);
  gap: 16px;
  align-items: center;
  margin-top: 2px;
}

.catalogue-heading > div {
  display: flex;
  flex-direction: column;
}

.catalogue-heading strong {
  font-size: 0.83rem;
}

.catalogue-heading span {
  color: rgba(var(--v-theme-on-surface), 0.45);
  font-size: 0.7rem;
}

.style-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
  align-items: start;
  max-height: 500px;
  padding: 3px 5px 3px 3px;
  overflow: auto;
}

.style-card {
  position: relative;
  min-width: 0;
  aspect-ratio: 9 / 16;
  padding: 0;
  overflow: hidden;
  color: white;
  text-align: left;
  cursor: pointer;
  background: #15171c;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 14px;
  transition: 160ms ease;
}

.style-card:hover {
  border-color: rgba(var(--v-theme-on-surface), 0.34);
  transform: translateY(-2px);
}

.style-card--selected {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.22);
}

.style-card__image {
  display: block;
  width: 100%;
  height: 100%;
}

.style-card__shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, transparent 44%, rgba(5, 6, 8, 0.9));
}

.style-card__name {
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

.style-card__check {
  position: absolute;
  top: 8px;
  right: 8px;
  color: rgb(var(--v-theme-primary));
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6));
}

.image-count {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 3px 6px;
  font-size: 0.61rem;
  font-weight: 750;
  background: rgba(8, 9, 12, 0.68);
  border-radius: 99px;
  backdrop-filter: blur(8px);
}

.image-placeholder,
.empty-search {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: rgba(var(--v-theme-on-surface), 0.38);
  background:
    radial-gradient(circle at 30% 20%, rgba(127, 140, 255, 0.25), transparent 32%),
    #15171c;
}

.empty-search {
  min-height: 150px;
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.13);
  border-radius: 16px;
}

@media (max-width: 1000px) {
  .style-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .selected-preview {
    grid-template-columns: 125px minmax(0, 1fr);
  }

  .catalogue-heading {
    grid-template-columns: 1fr;
  }

  .style-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    max-height: 430px;
  }
}
</style>
