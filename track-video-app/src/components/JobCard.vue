<template>
  <v-card
    class="job-card"
    rounded="xl"
    elevation="0"
    tabindex="0"
    @click="detailsOpen = true"
    @keydown.enter="detailsOpen = true"
  >
    <div class="job-media">
      <v-img
        v-if="coverImage"
        :src="coverImage"
        :alt="`${title} cover`"
        cover
        class="job-cover"
      />
      <div v-else class="job-cover job-cover--empty">
        <v-icon icon="mdi-music-note" size="42" />
      </div>

      <div class="job-media__shade"></div>
      <div class="job-labels">
        <StatusChip :status="props.job.status" />
        <v-chip
          size="small"
          variant="tonal"
          color="secondary"
          prepend-icon="mdi-palette-outline"
          class="job-style"
        >
          {{ templateLabel(props.job.template) }}
        </v-chip>
      </div>

      <div v-if="props.job.status === 'processing'" class="job-rendering">
        <v-progress-circular indeterminate color="white" width="3" size="42" />
      </div>
      <div v-else-if="props.job.status === 'completed'" class="job-play">
        <v-icon icon="mdi-play" size="30" />
      </div>
      <div v-else-if="props.job.status === 'failed'" class="job-rendering">
        <v-icon icon="mdi-alert-outline" size="40" />
      </div>
    </div>

    <div class="job-body">
      <div class="job-heading">
        <div class="job-title text-truncate">{{ title }}</div>
        <div class="job-date">{{ formatRelativeDate(props.job.triggeredAt) }}</div>
      </div>

      <div class="job-timings">
        <div>
          <span class="job-timing__label">How long did it take?</span>
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
          <div class="details-eyebrow">{{ templateLabel(props.job.template) }}</div>
          <h2 class="details-title">{{ title }}</h2>
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
            v-if="props.job.videoUrl"
            :src="props.job.videoUrl"
            :poster="coverImage || undefined"
            controls
            preload="metadata"
            playsinline
            class="details-video"
          >
            Your browser does not support video playback.
          </video>
          <div v-else class="details-placeholder">
            <v-img
              v-if="coverImage"
              :src="coverImage"
              cover
              class="details-placeholder__cover"
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
          <div class="d-flex align-center ga-2 flex-wrap">
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
                <span>Rendering</span>
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
              <div>
                <dt>Post ID</dt>
                <dd class="code-value">{{ props.job.postId }}</dd>
              </div>
              <div>
                <dt>Revision ID</dt>
                <dd class="code-value">{{ props.job.revisionId || '—' }}</dd>
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
import { computed, ref } from 'vue'
import StatusChip from '@/components/StatusChip.vue'
import type { TrackVideoJob } from '@/types/trackVideo'
import { templateLabel } from '@/types/trackVideo'
import {
  formatDate,
  formatDuration,
  formatRelativeDate,
} from '@/utils/formatters'

const props = defineProps<{
  job: TrackVideoJob
}>()

const detailsOpen = ref(false)
const title = computed(() => props.job.track?.name || `Track ${props.job.postId.slice(0, 8)}`)
const coverImage = computed(() => props.job.track?.pictureUrl || null)
const placeholderText = computed(() => {
  if (props.job.status === 'queued') {
    return 'Waiting for a renderer'
  }
  if (props.job.status === 'processing') {
    return 'Your video is being rendered'
  }
  if (props.job.status === 'failed') {
    return 'This generation failed'
  }
  return 'Video is not available'
})
</script>

<style scoped>
.job-card {
  overflow: hidden;
  background: rgba(var(--v-theme-surface), 0.82);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.09);
  cursor: pointer;
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease;
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

.job-cover {
  width: 100%;
  height: 100%;
  transition: transform 300ms ease;
}

.job-card:hover .job-cover {
  transform: scale(1.025);
}

.job-cover--empty {
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.38);
  background:
    radial-gradient(circle at 35% 30%, rgba(127, 140, 255, 0.38), transparent 28%),
    radial-gradient(circle at 72% 68%, rgba(255, 95, 210, 0.25), transparent 30%),
    #17191f;
}

.job-media__shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.1), transparent 45%, rgba(0, 0, 0, 0.48));
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
  font-weight: 700;
  background: rgba(75, 79, 126, 0.76) !important;
  color: white !important;
  backdrop-filter: blur(12px);
}

.job-play,
.job-rendering {
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
  letter-spacing: -0.02em;
}

.job-date {
  color: rgba(var(--v-theme-on-surface), 0.56);
  font-size: 0.74rem;
}

.job-timings {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: end;
  margin-top: 15px;
  padding-top: 13px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.job-timings > div {
  display: flex;
  flex-direction: column;
}

.job-timings strong {
  font-size: 0.82rem;
}

.job-timing__label {
  margin-bottom: 1px;
  color: rgba(var(--v-theme-on-surface), 0.48);
  font-size: 0.67rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
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

.details-eyebrow {
  color: rgb(var(--v-theme-primary));
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.details-title {
  margin-top: 2px;
  font-size: 1.35rem;
  letter-spacing: -0.035em;
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
    radial-gradient(circle at 20% 20%, rgba(127, 140, 255, 0.18), transparent 32%),
    #0e0f13;
}

.details-video,
.details-placeholder {
  width: min(100%, 320px);
  max-height: 600px;
  aspect-ratio: 9 / 16;
  overflow: hidden;
  background: #050506;
  border-radius: 18px;
  box-shadow: 0 28px 60px rgba(0, 0, 0, 0.46);
  object-fit: contain;
}

.details-placeholder {
  position: relative;
}

.details-placeholder__cover {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  filter: blur(14px);
  transform: scale(1.1);
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
  flex-direction: column;
  gap: 16px;
  align-items: center;
  justify-content: center;
  padding: 28px;
  color: white;
  text-align: center;
}

.details-content {
  padding: 24px;
  overflow: auto;
}

.details-section {
  margin-top: 26px;
}

.details-section h3 {
  margin-bottom: 10px;
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
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
  color: rgba(var(--v-theme-on-surface), 0.53);
  font-size: 0.7rem;
}

.performance-stat strong {
  margin-top: 3px;
  font-size: 0.95rem;
}

.details-list {
  display: flex;
  flex-direction: column;
  margin: 0;
}

.details-list > div {
  display: grid;
  grid-template-columns: 145px minmax(0, 1fr);
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}

.details-list dt {
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.77rem;
}

.details-list dd {
  margin: 0;
  font-size: 0.78rem;
  overflow-wrap: anywhere;
}

.code-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.7rem !important;
}

.details-actions {
  display: flex;
  gap: 10px;
  margin-top: 24px;
}

@media (max-width: 760px) {
  .details-layout {
    display: block;
    max-height: 80vh;
  }

  .video-stage {
    min-height: auto;
  }

  .details-video,
  .details-placeholder {
    width: min(76vw, 260px);
  }

  .performance-grid {
    grid-template-columns: 1fr;
  }
}
</style>
