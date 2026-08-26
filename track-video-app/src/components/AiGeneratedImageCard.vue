<template>
  <v-card
    class="image-card"
    rounded="xl"
    elevation="0"
    tabindex="0"
    role="button"
    aria-haspopup="dialog"
    :aria-label="`Open generated image details for ${title}`"
    @click="detailsOpen = true"
    @keydown.enter.self="detailsOpen = true"
    @keydown.space.self.prevent="detailsOpen = true"
  >
    <div class="image-card__media">
      <v-img
        v-if="props.job.imageUrl && !imageFailed"
        :src="props.job.imageUrl"
        :alt="`Generated artwork for ${title}`"
        cover
        class="image-card__image"
        loading="lazy"
        @error="imageFailed = true"
      />
      <div v-else class="image-card__placeholder">
        <v-progress-circular
          v-if="isActive"
          indeterminate
          color="primary"
          width="3"
          size="44"
        />
        <v-icon
          v-else
          :icon="props.job.status === 'failed' ? 'mdi-image-broken-variant' : 'mdi-image-sparkles-outline'"
          size="44"
        />
        <span>{{ placeholderText }}</span>
      </div>
      <div class="image-card__shade"></div>
      <div class="image-card__controls">
        <StatusChip :status="props.job.status" />
        <v-btn
          icon="mdi-delete-outline"
          variant="flat"
          size="x-small"
          color="error"
          aria-label="Delete generated image"
          :loading="props.deleting"
          @click.stop="requestDelete"
        />
      </div>
    </div>

    <div class="image-card__body">
      <div class="image-card__prompt">{{ displayPrompt }}</div>
      <div class="image-card__meta">
        <span>{{ props.job.track?.name || 'Prompt only' }}</span>
        <span>·</span>
        <span>{{ formatRelativeDate(props.job.triggeredAt) }}</span>
      </div>
      <div class="image-card__timing">
        <span>Generated in</span>
        <strong>{{ formatDuration(props.job.totalDurationMs) }}</strong>
      </div>
    </div>
  </v-card>

  <v-dialog v-model="detailsOpen" max-width="1040">
    <v-card class="details-card" rounded="xl">
      <header class="details-header">
        <div>
          <span>Visual style exploration</span>
          <h2>{{ title }}</h2>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          aria-label="Close image details"
          @click="detailsOpen = false"
        />
      </header>

      <div class="details-layout">
        <div class="details-artwork">
          <v-img
            v-if="props.job.imageUrl && !imageFailed"
            :src="props.job.imageUrl"
            :alt="`Generated artwork for ${title}`"
            contain
            class="details-artwork__image"
            @error="imageFailed = true"
          />
          <div v-else class="image-card__placeholder">
            <v-progress-circular
              v-if="isActive"
              indeterminate
              color="primary"
              width="3"
              size="52"
            />
            <v-icon v-else icon="mdi-image-off-outline" size="52" />
            <span>{{ placeholderText }}</span>
          </div>
        </div>

        <div class="details-content">
          <div class="details-chips">
            <StatusChip :status="props.job.status" />
            <v-chip size="small" variant="tonal" prepend-icon="mdi-clock-outline">
              {{ formatRelativeDate(props.job.triggeredAt) }}
            </v-chip>
          </div>

          <v-alert
            v-if="props.job.error"
            type="error"
            variant="tonal"
            density="compact"
          >
            {{ props.job.error.message }}
          </v-alert>

          <section>
            <h3>Prompt</h3>
            <p>{{ props.job.promptTemplate }}</p>
          </section>

          <section v-if="resolvedPromptDiffers">
            <h3>Resolved prompt</h3>
            <p>{{ props.job.resolvedPrompt }}</p>
          </section>

          <section>
            <h3>Details</h3>
            <dl>
              <div>
                <dt>Track</dt>
                <dd>{{ props.job.track?.name || 'Not used' }}</dd>
              </div>
              <div>
                <dt>Genre</dt>
                <dd>{{ props.job.track?.genre || 'Not used' }}</dd>
              </div>
              <div>
                <dt>Generated in</dt>
                <dd>{{ formatDuration(props.job.totalDurationMs) }}</dd>
              </div>
              <div>
                <dt>Job ID</dt>
                <dd class="code-value">{{ props.job.jobId }}</dd>
              </div>
            </dl>
          </section>

          <div class="details-actions">
            <v-btn
              color="error"
              variant="tonal"
              prepend-icon="mdi-delete-outline"
              :loading="props.deleting"
              @click.stop="requestDelete"
            >
              Delete
            </v-btn>
            <v-btn
              v-if="props.job.trackUrl"
              :href="props.job.trackUrl"
              target="_blank"
              rel="noopener"
              variant="tonal"
              prepend-icon="mdi-open-in-new"
              @click.stop
            >
              Open track
            </v-btn>
            <v-btn
              v-if="props.job.imageUrl"
              :href="props.job.imageUrl"
              target="_blank"
              rel="noopener"
              color="primary"
              prepend-icon="mdi-image-outline"
              @click.stop
            >
              Open PNG
            </v-btn>
          </div>
        </div>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import StatusChip from '@/components/StatusChip.vue'
import type { AiGeneratedImageJob } from '@/types/aiImageGeneration'
import { formatDuration, formatRelativeDate } from '@/utils/formatters'

const props = withDefaults(defineProps<{
  job: AiGeneratedImageJob
  deleting?: boolean
}>(), {
  deleting: false,
})

const emit = defineEmits<{
  delete: [job: AiGeneratedImageJob]
}>()

const detailsOpen = ref(false)
const imageFailed = ref(false)
const isActive = computed(() => (
  props.job.status === 'queued' || props.job.status === 'processing'
))
const displayPrompt = computed(() => props.job.resolvedPrompt || props.job.promptTemplate)
const resolvedPromptDiffers = computed(() => (
  props.job.resolvedPrompt
  && props.job.resolvedPrompt !== props.job.promptTemplate
))
const title = computed(() => (
  props.job.track?.name || `Image ${props.job.jobId.slice(0, 8)}`
))
const placeholderText = computed(() => {
  if (props.job.status === 'queued') {
    return 'Waiting to generate'
  }
  if (props.job.status === 'processing') {
    return 'Creating artwork'
  }
  if (props.job.status === 'failed') {
    return 'Generation failed'
  }
  return 'Image unavailable'
})

function requestDelete(): void {
  detailsOpen.value = false
  emit('delete', props.job)
}

watch(() => props.job.imageUrl, () => {
  imageFailed.value = false
})
</script>

<style scoped>
.image-card {
  overflow: hidden;
  cursor: pointer;
  background: rgba(var(--v-theme-surface), 0.82);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.09);
  transition: 180ms ease;
}

.image-card:hover,
.image-card:focus-visible {
  border-color: rgba(var(--v-theme-primary), 0.65);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.24);
  outline: none;
  transform: translateY(-4px);
}

.image-card__media {
  position: relative;
  aspect-ratio: 9 / 16;
  overflow: hidden;
  background: #13151a;
}

.image-card__image,
.details-artwork__image {
  width: 100%;
  height: 100%;
}

.image-card__image {
  transition: transform 300ms ease;
}

.image-card:hover .image-card__image {
  transform: scale(1.025);
}

.image-card__placeholder {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 24px;
  color: rgba(var(--v-theme-on-surface), 0.45);
  text-align: center;
  background:
    radial-gradient(circle at 28% 18%, rgba(127, 140, 255, 0.22), transparent 34%),
    #13151a;
}

.image-card__placeholder span {
  font-size: 0.72rem;
}

.image-card__shade {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(to bottom, rgba(5, 6, 8, 0.2), transparent 24%, rgba(5, 6, 8, 0.35));
}

.image-card__controls {
  position: absolute;
  top: 10px;
  right: 10px;
  left: 10px;
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}

.image-card__body {
  padding: 14px;
}

.image-card__prompt {
  display: -webkit-box;
  min-height: 2.8em;
  overflow: hidden;
  font-size: 0.82rem;
  font-weight: 720;
  line-height: 1.4;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.image-card__meta {
  display: flex;
  gap: 5px;
  margin-top: 9px;
  overflow: hidden;
  color: rgba(var(--v-theme-on-surface), 0.45);
  font-size: 0.66rem;
  white-space: nowrap;
}

.image-card__meta span:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
}

.image-card__timing {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 13px;
  padding-top: 11px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.image-card__timing span {
  color: rgba(var(--v-theme-on-surface), 0.42);
  font-size: 0.64rem;
}

.image-card__timing strong {
  font-size: 0.76rem;
}

.details-card {
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
}

.details-header {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  justify-content: space-between;
  padding: 22px 24px;
}

.details-header span {
  color: rgb(var(--v-theme-primary));
  font-size: 0.66rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.11em;
}

.details-header h2 {
  margin: 4px 0 0;
  font-size: clamp(1.4rem, 3vw, 2.1rem);
  letter-spacing: -0.04em;
}

.details-layout {
  display: grid;
  grid-template-columns: minmax(260px, 430px) minmax(0, 1fr);
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.details-artwork {
  aspect-ratio: 9 / 16;
  max-height: 72vh;
  background: #0d0f13;
}

.details-content {
  max-height: 72vh;
  padding: 24px;
  overflow-y: auto;
}

.details-chips,
.details-actions {
  display: flex;
  gap: 9px;
  flex-wrap: wrap;
}

.details-content section {
  margin-top: 24px;
}

.details-content h3 {
  margin: 0 0 9px;
  color: rgba(var(--v-theme-on-surface), 0.45);
  font-size: 0.66rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.details-content p {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.65;
  white-space: pre-wrap;
}

.details-content dl {
  margin: 0;
}

.details-content dl div {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr);
  gap: 16px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.07);
}

.details-content dt {
  color: rgba(var(--v-theme-on-surface), 0.42);
  font-size: 0.69rem;
}

.details-content dd {
  margin: 0;
  overflow-wrap: anywhere;
  font-size: 0.73rem;
}

.code-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.details-actions {
  margin-top: 26px;
}

@media (max-width: 720px) {
  .details-layout {
    grid-template-columns: 1fr;
  }

  .details-artwork {
    width: min(100%, 300px);
    max-height: none;
    margin: 0 auto;
  }

  .details-content {
    max-height: none;
  }
}
</style>
