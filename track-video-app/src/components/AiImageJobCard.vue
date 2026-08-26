<template>
  <v-card
    class="job-card"
    rounded="xl"
    elevation="0"
    tabindex="0"
    role="button"
    aria-haspopup="dialog"
    :aria-label="`Open details for ${title}`"
    @click="detailsOpen = true"
    @keydown.enter="detailsOpen = true"
    @keydown.space.prevent="detailsOpen = true"
  >
    <div class="job-media">
      <v-img
        v-if="props.job.thumbnailUrl && !thumbnailFailed"
        :src="props.job.thumbnailUrl"
        :alt="`${title} AI video thumbnail`"
        cover
        class="job-thumbnail"
        @error="thumbnailFailed = true"
      />
      <div v-else class="job-thumbnail job-thumbnail--empty">
        <v-icon icon="mdi-image-sparkles-outline" size="42" />
      </div>

      <div class="job-media__shade"></div>
      <div class="job-labels">
        <StatusChip :status="props.job.status" />
        <v-chip size="small" variant="tonal" class="job-style">
          {{ props.visualStyleName }}
        </v-chip>
      </div>

      <div v-if="props.job.status === 'processing' || props.job.status === 'queued'" class="job-state">
        <v-progress-circular indeterminate color="white" width="3" size="42" />
      </div>
      <div v-else-if="props.job.status === 'completed'" class="job-play">
        <v-icon icon="mdi-play" size="30" />
      </div>
      <div v-else class="job-state">
        <v-icon icon="mdi-alert-outline" size="40" />
      </div>
    </div>

    <div class="job-body">
      <div class="job-heading">
        <div class="job-title text-truncate">{{ title }}</div>
        <div class="job-date">{{ formatRelativeDate(props.job.triggeredAt) }}</div>
      </div>
      <div class="job-template">
        <v-icon icon="mdi-motion-play-outline" size="15" />
        {{ props.templateName }}
      </div>
      <div class="job-timings">
        <div>
          <span>Generated in</span>
          <strong>{{ formatDuration(props.job.totalDurationMs) }}</strong>
        </div>
        <v-icon icon="mdi-chevron-right" size="20" />
      </div>
    </div>
  </v-card>

  <v-dialog v-model="detailsOpen" max-width="980">
    <v-card class="details-card" rounded="xl">
      <div class="details-header">
        <div>
          <div class="details-eyebrow">AI image · {{ props.templateName }}</div>
          <h2>{{ title }}</h2>
        </div>
        <v-btn
          icon="mdi-close"
          variant="text"
          aria-label="Close details"
          @click="detailsOpen = false"
        />
      </div>

      <v-divider />

      <div class="details-layout">
        <div class="video-stage">
          <video
            v-if="props.job.videoUrl && !videoFailed"
            :src="props.job.videoUrl"
            :poster="props.job.thumbnailUrl || undefined"
            controls
            preload="metadata"
            playsinline
            class="details-video"
            @error="videoFailed = true"
          >
            Your browser does not support video playback.
          </video>
          <div v-else class="details-placeholder">
            <v-img
              v-if="props.job.thumbnailUrl && !thumbnailFailed"
              :src="props.job.thumbnailUrl"
              cover
              class="details-placeholder__image"
              @error="thumbnailFailed = true"
            />
            <div class="details-placeholder__shade"></div>
            <div class="details-placeholder__state">
              <v-progress-circular
                v-if="props.job.status === 'queued' || props.job.status === 'processing'"
                indeterminate
                color="white"
                width="3"
                size="48"
              />
              <v-icon v-else icon="mdi-video-off-outline" size="52" />
              <span>{{ placeholderText }}</span>
            </div>
          </div>
        </div>

        <div class="details-content">
          <div class="details-chips">
            <StatusChip :status="props.job.status" />
            <v-chip size="small" variant="tonal" prepend-icon="mdi-clock-outline">
              Triggered {{ formatRelativeDate(props.job.triggeredAt) }}
            </v-chip>
          </div>

          <v-alert
            v-if="props.job.error"
            type="error"
            variant="tonal"
            density="compact"
            class="mt-4"
          >
            <strong>{{ props.job.error.code }}</strong><br>
            {{ props.job.error.message }}
          </v-alert>

          <section class="details-section">
            <h3>Creative direction</h3>
            <dl class="details-list">
              <div>
                <dt>Visual style</dt>
                <dd>{{ props.visualStyleName }}</dd>
              </div>
              <div>
                <dt>Video template</dt>
                <dd>{{ props.templateName }}</dd>
              </div>
              <div>
                <dt>Assigned genre</dt>
                <dd>{{ props.job.assignedGenre || 'Not assigned yet' }}</dd>
              </div>
            </dl>
          </section>

          <section class="details-section">
            <h3>Performance</h3>
            <div class="performance-grid">
              <div class="performance-stat performance-stat--total">
                <span>End to end</span>
                <strong>{{ formatDuration(props.job.totalDurationMs) }}</strong>
              </div>
              <div class="performance-stat">
                <span>In queue</span>
                <strong>{{ formatDuration(props.job.queueDurationMs) }}</strong>
              </div>
              <div class="performance-stat">
                <span>Processing</span>
                <strong>{{ formatDuration(props.job.processingDurationMs) }}</strong>
              </div>
            </div>
          </section>

          <section class="details-section">
            <h3>Timeline</h3>
            <dl class="details-list">
              <div>
                <dt>Triggered</dt>
                <dd>{{ formatDate(props.job.triggeredAt) }}</dd>
              </div>
              <div>
                <dt>Processing started</dt>
                <dd>{{ formatDate(props.job.processingStartedAt) }}</dd>
              </div>
              <div>
                <dt>Finished</dt>
                <dd>{{ formatDate(props.job.finishedAt) }}</dd>
              </div>
            </dl>
          </section>

          <section class="details-section">
            <h3>Job data</h3>
            <dl class="details-list">
              <div>
                <dt>Job ID</dt>
                <dd class="code-value">{{ props.job.jobId }}</dd>
              </div>
              <div v-if="props.job.postId">
                <dt>Post ID</dt>
                <dd class="code-value">{{ props.job.postId }}</dd>
              </div>
            </dl>
          </section>

          <div class="details-actions">
            <v-btn
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
              v-if="props.job.videoUrl"
              :href="props.job.videoUrl"
              target="_blank"
              rel="noopener"
              color="primary"
              prepend-icon="mdi-download"
              @click.stop
            >
              Open MP4
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
import type { AiImageVideoJob } from '@/types/aiImageTrackVideo'
import {
  formatDate,
  formatDuration,
  formatRelativeDate,
} from '@/utils/formatters'

const props = defineProps<{
  job: AiImageVideoJob
  templateName: string
  visualStyleName: string
}>()

const detailsOpen = ref(false)
const thumbnailFailed = ref(false)
const videoFailed = ref(false)
const title = computed(() => (
  props.job.track?.name
  || (props.job.postId ? `Track ${props.job.postId.slice(0, 8)}` : `AI video ${props.job.jobId.slice(0, 8)}`)
))
const placeholderText = computed(() => {
  if (props.job.status === 'queued') {
    return 'Waiting to create the artwork'
  }
  if (props.job.status === 'processing') {
    return 'Creating and animating your artwork'
  }
  if (props.job.status === 'failed') {
    return 'This AI-image generation failed'
  }
  if (videoFailed.value) {
    return 'The video preview could not be loaded. You can still open the MP4 directly.'
  }
  return 'Video is not available'
})

watch(() => props.job.thumbnailUrl, () => {
  thumbnailFailed.value = false
})

watch(() => props.job.videoUrl, () => {
  videoFailed.value = false
})
</script>

<style scoped>
.job-card {
  overflow: hidden;
  cursor: pointer;
  background: rgba(var(--v-theme-surface), 0.82);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.09);
  transition: 180ms ease;
}

.job-card:hover,
.job-card:focus-visible {
  border-color: rgba(var(--v-theme-primary), 0.65);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.2);
  outline: none;
  transform: translateY(-4px);
}

.job-media {
  position: relative;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  background: #17191f;
}

.job-thumbnail {
  width: 100%;
  height: 100%;
  transition: transform 300ms ease;
}

.job-card:hover .job-thumbnail {
  transform: scale(1.025);
}

.job-thumbnail--empty {
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.4);
  background:
    radial-gradient(circle at 25% 24%, rgba(255, 92, 74, 0.32), transparent 28%),
    radial-gradient(circle at 75% 70%, rgba(175, 45, 55, 0.38), transparent 30%),
    #15171c;
}

.job-media__shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.12), transparent 45%, rgba(0, 0, 0, 0.5));
}

.job-labels {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  max-width: calc(100% - 24px);
}

.job-style {
  max-width: 170px;
  overflow: hidden;
  color: white !important;
  font-weight: 700;
  text-overflow: ellipsis;
  background: rgba(75, 79, 126, 0.78) !important;
  backdrop-filter: blur(12px);
}

.job-play,
.job-state {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: white;
}

.job-play {
  width: 54px;
  height: 54px;
  margin: auto;
  padding-left: 3px;
  background: rgba(12, 13, 16, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.32);
  border-radius: 50%;
  backdrop-filter: blur(10px);
}

.job-body {
  padding: 17px;
}

.job-heading {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: baseline;
}

.job-title {
  font-size: 1rem;
  font-weight: 780;
}

.job-date,
.job-template {
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.72rem;
}

.job-template {
  display: flex;
  gap: 5px;
  align-items: center;
  margin-top: 5px;
}

.job-timings {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: end;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.job-timings > div {
  display: flex;
  flex-direction: column;
}

.job-timings span {
  color: rgba(var(--v-theme-on-surface), 0.46);
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.job-timings strong {
  font-size: 0.82rem;
}

.details-card {
  overflow: hidden;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.11);
}

.details-header {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
}

.details-eyebrow,
.details-section h3 {
  color: rgb(var(--v-theme-primary));
  font-size: 0.67rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.details-header h2 {
  margin-top: 2px;
  font-size: 1.35rem;
}

.details-layout {
  display: grid;
  grid-template-columns: minmax(300px, 0.8fr) minmax(0, 1.2fr);
  max-height: min(76vh, 760px);
  overflow: auto;
}

.video-stage {
  display: grid;
  place-items: center;
  min-height: 560px;
  padding: 22px;
  background:
    radial-gradient(circle at 20% 20%, rgba(255, 92, 74, 0.18), transparent 32%),
    #0e0f13;
}

.details-video,
.details-placeholder {
  width: min(100%, 320px);
  max-height: 600px;
  aspect-ratio: 9 / 16;
  overflow: hidden;
  object-fit: contain;
  background: #050506;
  border-radius: 18px;
  box-shadow: 0 28px 60px rgba(0, 0, 0, 0.46);
}

.details-placeholder {
  position: relative;
}

.details-placeholder__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.details-placeholder__shade {
  position: absolute;
  inset: 0;
  background: rgba(5, 5, 7, 0.58);
}

.details-placeholder__state {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 28px;
  color: white;
  text-align: center;
}

.details-content {
  padding: 24px;
  overflow: auto;
}

.details-chips,
.details-actions {
  display: flex;
  gap: 9px;
  flex-wrap: wrap;
}

.details-section {
  margin-top: 25px;
}

.details-section h3 {
  margin-bottom: 10px;
  color: rgba(var(--v-theme-on-surface), 0.55);
}

.details-list {
  margin: 0;
}

.details-list div {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr);
  gap: 14px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}

.details-list dt {
  color: rgba(var(--v-theme-on-surface), 0.48);
  font-size: 0.73rem;
}

.details-list dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
  font-size: 0.76rem;
}

.code-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.performance-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.performance-stat {
  display: flex;
  flex-direction: column;
  padding: 12px;
  background: rgba(var(--v-theme-on-surface), 0.035);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.07);
  border-radius: 12px;
}

.performance-stat--total {
  background: rgba(var(--v-theme-primary), 0.09);
  border-color: rgba(var(--v-theme-primary), 0.2);
}

.performance-stat span {
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.68rem;
}

.details-actions {
  margin-top: 26px;
}

@media (max-width: 760px) {
  .details-layout {
    grid-template-columns: 1fr;
  }

  .video-stage {
    min-height: 480px;
  }
}
</style>
