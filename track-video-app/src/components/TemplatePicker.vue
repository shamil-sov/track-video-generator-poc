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
      <span class="template-preview" aria-hidden="true">
        <span class="template-preview__cover">
          <v-icon icon="mdi-music-note" size="20" />
        </span>
        <span class="template-preview__effect"></span>
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
import { VIDEO_TEMPLATES, type TrackVideoTemplate } from '@/types/trackVideo'

const model = defineModel<TrackVideoTemplate>({ required: true })
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
  grid-template-columns: 82px minmax(0, 1fr) 20px;
  gap: 14px;
  align-items: center;
  min-width: 0;
  min-height: 112px;
  padding: 14px;
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
  position: relative;
  display: grid;
  place-items: center;
  width: 82px;
  aspect-ratio: 1;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 45%, #2e3340 0 25%, #121418 62%),
    #111318;
  border-radius: 14px;
}

.template-preview__cover {
  position: relative;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 32px;
  aspect-ratio: 1;
  color: #f6f7f4;
  background: linear-gradient(145deg, #343945, #171a21);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.45);
}

.template-preview__effect {
  position: absolute;
  inset: 0;
}

.template-card--orbit .template-preview__effect {
  inset: 15px;
  border: 4px dotted #d7ff4f;
  border-radius: 50%;
  filter: drop-shadow(0 0 5px rgba(215, 255, 79, 0.72));
  animation: orbit-spin 9s linear infinite;
}

.template-card--prism-spectrum .template-preview {
  background:
    linear-gradient(135deg, rgba(255, 95, 210, 0.18), transparent 52%),
    #111318;
}

.template-card--prism-spectrum .template-preview__effect {
  background:
    linear-gradient(90deg, transparent 9%, #ff5fd2 10% 12%, transparent 13% 20%, #a87cff 21% 24%, transparent 25% 34%, #68e3ff 35% 38%, transparent 39% 48%, #f8ff68 49% 52%, transparent 53% 62%, #ff8d5f 63% 66%, transparent 67% 100%);
  clip-path: polygon(0 82%, 0 64%, 9% 48%, 16% 68%, 24% 24%, 32% 74%, 41% 37%, 49% 79%, 58% 20%, 67% 69%, 75% 43%, 84% 78%, 91% 54%, 100% 67%, 100% 84%);
  filter: drop-shadow(0 0 4px rgba(255, 95, 210, 0.5));
}

.template-card--3d-style .template-preview__effect {
  inset: -22px -8px;
  background:
    repeating-radial-gradient(
      ellipse at 25% 42%,
      transparent 0 8px,
      rgba(127, 140, 255, 0.88) 10px 12px,
      rgba(255, 95, 210, 0.4) 14px,
      transparent 17px 23px
    );
  transform: rotate(-18deg) scale(1.2);
  filter: blur(0.7px) drop-shadow(0 0 6px rgba(127, 140, 255, 0.65));
  animation: silk-shift 7s ease-in-out infinite alternate;
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

@keyframes orbit-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes silk-shift {
  to {
    transform: rotate(18deg) scale(1.35);
  }
}

@media (max-width: 1000px) {
  .template-grid {
    grid-template-columns: 1fr;
  }
}
</style>
