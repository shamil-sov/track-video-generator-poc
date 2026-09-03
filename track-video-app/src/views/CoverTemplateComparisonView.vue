<template>
  <main>
    <v-container class="page-container content-container">
      <CoverSectionNav />

      <header class="page-header">
        <div>
          <div class="section-kicker">Cover videos</div>
          <h1>Compare templates</h1>
          <p>Generate all five supported templates from one cover and compare them together.</p>
        </div>
        <v-chip size="small" variant="tonal" :prepend-icon="previewKind === 'video' ? 'mdi-motion-play' : 'mdi-image-outline'">
          {{ capabilityLabel }}
        </v-chip>
      </header>

      <v-card class="setup-card" rounded="xl" elevation="0">
        <div class="field-label">Track</div>
        <v-autocomplete
          v-model="selectedTrackUrl"
          :items="trackOptions"
          label="BandLab track URL"
          placeholder="Choose a configured track"
          variant="outlined"
          density="comfortable"
          color="primary"
          prepend-inner-icon="mdi-music-note"
          hide-details
          clearable
          :loading="trackLoading"
          no-data-text="No matching track URL"
        />

        <div v-if="trackLoading" class="track-loading" aria-label="Loading track details">
          <v-skeleton-loader type="image" />
          <v-skeleton-loader type="heading, text" />
        </div>

        <div v-else-if="trackError" class="track-error" role="alert">
          <v-icon icon="mdi-alert-circle-outline" size="20" />
          <span>{{ trackError }}</span>
        </div>

        <article v-else-if="track" class="selected-track">
          <img :src="track.pictureUrl" :alt="`${track.name} cover`" />
          <div class="selected-track__copy">
            <span>Selected track</span>
            <h2>{{ track.name }}</h2>
            <p>
              {{ track.artistName }}
              <span v-if="track.artistUsername">@{{ track.artistUsername }}</span>
            </p>
          </div>
        </article>

        <div v-else class="track-empty">
          <v-icon icon="mdi-music-box-multiple-outline" size="32" />
          <span>Choose one of the configured tracks to load its cover and artist.</span>
        </div>

        <v-alert
          v-if="track && !track.previewSupported"
          type="warning"
          variant="tonal"
          class="unsupported-alert"
        >
          This track uses a profile picture instead of a supported BandLab song-cover URL.
        </v-alert>

        <div class="generation-controls">
          <fieldset class="preview-kind">
            <legend>Preview type</legend>
            <div class="preview-kind__options">
              <button
                type="button"
                class="preview-kind__option"
                data-type="video"
                :class="{ 'preview-kind__option--selected': previewKind === 'video' }"
                :aria-pressed="previewKind === 'video'"
                @click="setPreviewKind('video')"
              >
                <v-icon icon="mdi-motion-play-outline" size="19" />
                <span>Motion</span>
                <small>Five silent MP4s</small>
              </button>
              <button
                type="button"
                class="preview-kind__option"
                data-type="image"
                :class="{ 'preview-kind__option--selected': previewKind === 'image' }"
                :aria-pressed="previewKind === 'image'"
                @click="setPreviewKind('image')"
              >
                <v-icon icon="mdi-image-multiple-outline" size="19" />
                <span>Images</span>
                <small>Five JPEGs</small>
              </button>
            </div>
          </fieldset>

          <v-btn
            class="generate-batch"
            color="primary"
            size="large"
            rounded="lg"
            prepend-icon="mdi-view-grid-plus-outline"
            :loading="batchLoading"
            :disabled="!track?.previewSupported || batchLoading"
            @click="generateBatch"
          >
            Generate 5 previews
          </v-btn>
        </div>
      </v-card>

      <v-alert
        v-if="batchError"
        class="batch-error"
        type="error"
        variant="tonal"
        closable
        @click:close="batchError = null"
      >
        {{ batchError }}
      </v-alert>

      <section v-if="batchLoading || batchResult" class="results-section" aria-labelledby="comparison-results-heading">
        <div class="results-heading">
          <div>
            <div class="section-kicker">Fresh comparison</div>
            <h2 id="comparison-results-heading">
              {{ batchLoading ? 'Generating all five previews…' : `${orderedPreviews.length} previews generated` }}
            </h2>
            <p v-if="batchResult">Completed in {{ formatDuration(batchResult.totalDurationMs) }}</p>
            <p v-else>The cover is downloaded once and all templates render concurrently.</p>
          </div>
          <v-btn
            v-if="previewKind === 'video' && batchResult"
            variant="tonal"
            size="small"
            :prepend-icon="videosPlaying ? 'mdi-pause' : 'mdi-play'"
            :disabled="!videosReady"
            @click="toggleVideoPlayback"
          >
            {{ videosPlaying ? 'Pause all' : 'Play all' }}
          </v-btn>
        </div>

        <div class="preview-grid-wrap">
          <div class="preview-grid">
            <article v-for="index in (batchLoading ? 5 : 0)" :key="`loading-${index}`" class="preview-card preview-card--loading">
              <div class="preview-placeholder">
                <v-progress-circular indeterminate color="primary" size="28" />
              </div>
              <div class="preview-card__copy">
                <span>Rendering template {{ index }}</span>
              </div>
            </article>

            <article
              v-for="item in orderedPreviews"
              :key="item.template"
              class="preview-card"
            >
              <button class="preview-card__media" type="button" :aria-label="`Open ${templateName(item.template)} preview`" @click="openPreview(item)">
                <video
                  v-if="previewKind === 'video'"
                  ref="previewVideos"
                  :src="item.previewUrl"
                  muted
                  loop
                  playsinline
                  preload="auto"
                  @loadeddata="markVideoReady(item.previewUrl)"
                ></video>
                <img v-else :src="item.previewUrl" :alt="`${templateName(item.template)} preview`" />
                <span class="preview-card__expand"><v-icon icon="mdi-arrow-expand" size="18" /></span>
              </button>
              <div class="preview-card__copy">
                <strong>{{ templateName(item.template) }}</strong>
                <a :href="item.previewUrl" target="_blank" rel="noopener" @click.stop>
                  Open file
                  <v-icon icon="mdi-open-in-new" size="13" />
                </a>
              </div>
            </article>
          </div>
        </div>
      </section>
    </v-container>

    <v-dialog v-model="previewDialogOpen" max-width="500">
      <v-card v-if="selectedPreview" class="preview-dialog" rounded="xl">
        <div class="preview-dialog__heading">
          <div>
            <span>{{ previewKind === 'video' ? 'Motion preview' : 'Image preview' }}</span>
            <h2>{{ templateName(selectedPreview.template) }}</h2>
          </div>
          <v-btn icon="mdi-close" variant="text" aria-label="Close preview" @click="previewDialogOpen = false" />
        </div>
        <video
          v-if="previewKind === 'video'"
          :src="selectedPreview.previewUrl"
          autoplay
          controls
          loop
          muted
          playsinline
        ></video>
        <img v-else :src="selectedPreview.previewUrl" :alt="`${templateName(selectedPreview.template)} preview`" />
      </v-card>
    </v-dialog>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import CoverSectionNav from '@/components/CoverSectionNav.vue'
import { useVideoTemplates } from '@/composables/useVideoTemplates'
import { COVER_PREVIEW_TRACK_URLS } from '@/data/coverPreviewTracks'
import {
  createCoverImagePreviewBatch,
  createCoverVideoPreviewBatch,
  getCoverPreviewTrack,
} from '@/services/api'
import type {
  CoverPreviewBatchItem,
  CoverPreviewBatchKind,
  CoverPreviewBatchResult,
  CoverPreviewTrackMetadata,
  TrackVideoTemplate,
} from '@/types/trackVideo'
import { formatDuration } from '@/utils/formatters'

const BATCH_TEMPLATE_ORDER: readonly TrackVideoTemplate[] = [
  'orbit',
  'music-visualizer',
  'vinyl-orbit',
  'vinyl-sleeve',
  'edge-choir',
]

const { loadTemplates, templateName } = useVideoTemplates()
const trackOptions = COVER_PREVIEW_TRACK_URLS.map(url => ({ title: url, value: url }))
const selectedTrackUrl = ref<string | null>(null)
const track = ref<CoverPreviewTrackMetadata | null>(null)
const trackLoading = ref(false)
const trackError = ref<string | null>(null)
const previewKind = ref<CoverPreviewBatchKind>('video')
const batchResult = ref<CoverPreviewBatchResult | null>(null)
const batchLoading = ref(false)
const batchError = ref<string | null>(null)
const previewVideos = ref<HTMLVideoElement[]>([])
const readyVideoUrls = new Set<string>()
const videosReady = ref(false)
const videosPlaying = ref(false)
const selectedPreview = ref<CoverPreviewBatchItem | null>(null)
const previewDialogOpen = ref(false)

let trackRequestSequence = 0
let batchRequestSequence = 0
let trackController: AbortController | null = null
let batchController: AbortController | null = null

const capabilityLabel = computed(() => previewKind.value === 'video'
  ? '5 templates · 360 × 640 · 2 seconds · Silent'
  : '5 templates · 360 × 640 · JPEG')

const orderedPreviews = computed(() => {
  if (!batchResult.value) {
    return []
  }

  const order = new Map(BATCH_TEMPLATE_ORDER.map((template, index) => [template, index]))
  return [...batchResult.value.data].sort((left, right) => (
    (order.get(left.template) ?? Number.MAX_SAFE_INTEGER)
    - (order.get(right.template) ?? Number.MAX_SAFE_INTEGER)
  ))
})

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

function pauseBatchVideos(): void {
  for (const video of previewVideos.value) {
    video.pause()
  }
  videosPlaying.value = false
}

function resetBatch(): void {
  batchRequestSequence += 1
  batchController?.abort()
  batchController = null
  pauseBatchVideos()
  readyVideoUrls.clear()
  videosReady.value = false
  previewVideos.value = []
  batchResult.value = null
  batchLoading.value = false
  batchError.value = null
  selectedPreview.value = null
  previewDialogOpen.value = false
}

async function playBatchVideos(reset = false): Promise<void> {
  if (reset) {
    for (const video of previewVideos.value) {
      video.currentTime = 0
    }
  }

  const results = await Promise.allSettled(previewVideos.value.map(video => video.play()))
  videosPlaying.value = results.length > 0 && results.every(result => result.status === 'fulfilled')
}

function markVideoReady(previewUrl: string): void {
  readyVideoUrls.add(previewUrl)
  if (batchResult.value && readyVideoUrls.size === batchResult.value.data.length) {
    videosReady.value = true
    void playBatchVideos(true)
  }
}

function toggleVideoPlayback(): void {
  if (videosPlaying.value) {
    pauseBatchVideos()
  } else {
    void playBatchVideos()
  }
}

function setPreviewKind(kind: CoverPreviewBatchKind): void {
  if (previewKind.value === kind) {
    return
  }

  previewKind.value = kind
  resetBatch()
}

function openPreview(item: CoverPreviewBatchItem): void {
  selectedPreview.value = item
  previewDialogOpen.value = true
}

async function generateBatch(): Promise<void> {
  if (!track.value?.previewSupported) {
    return
  }

  const requestSequence = ++batchRequestSequence
  batchController?.abort()
  batchController = new AbortController()
  pauseBatchVideos()
  readyVideoUrls.clear()
  videosReady.value = false
  previewVideos.value = []
  batchResult.value = null
  batchError.value = null
  batchLoading.value = true
  selectedPreview.value = null
  previewDialogOpen.value = false

  try {
    const createBatch = previewKind.value === 'video'
      ? createCoverVideoPreviewBatch
      : createCoverImagePreviewBatch
    const result = await createBatch(track.value.pictureUrl, batchController.signal)
    if (requestSequence === batchRequestSequence) {
      batchResult.value = result
    }
  } catch (error) {
    if (requestSequence === batchRequestSequence && !(error instanceof DOMException && error.name === 'AbortError')) {
      batchError.value = errorMessage(error, 'Could not generate the preview batch.')
    }
  } finally {
    if (requestSequence === batchRequestSequence) {
      batchLoading.value = false
      batchController = null
    }
  }
}

async function loadTrack(trackUrl: string | null): Promise<void> {
  const requestSequence = ++trackRequestSequence
  trackController?.abort()
  trackController = null
  resetBatch()
  track.value = null
  trackError.value = null

  if (!trackUrl) {
    trackLoading.value = false
    return
  }

  trackController = new AbortController()
  trackLoading.value = true
  try {
    const result = await getCoverPreviewTrack(trackUrl, trackController.signal)
    if (requestSequence === trackRequestSequence) {
      track.value = result
    }
  } catch (error) {
    if (requestSequence === trackRequestSequence && !(error instanceof DOMException && error.name === 'AbortError')) {
      trackError.value = errorMessage(error, 'Could not load this track.')
    }
  } finally {
    if (requestSequence === trackRequestSequence) {
      trackLoading.value = false
      trackController = null
    }
  }
}

watch(selectedTrackUrl, loadTrack)

onMounted(() => {
  void loadTemplates()
})

onBeforeUnmount(() => {
  trackRequestSequence += 1
  resetBatch()
  trackController?.abort()
})
</script>

<style scoped>
.content-container {
  padding-top: 38px;
  padding-bottom: 80px;
}

.page-header,
.generation-controls,
.results-heading,
.preview-dialog__heading {
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
}

.page-header {
  align-items: flex-end;
  margin-bottom: 24px;
}

.section-kicker {
  margin-bottom: 5px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.67rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.page-header h1 {
  margin: 0;
  font-size: clamp(2rem, 5vw, 3.4rem);
  line-height: 1;
  letter-spacing: -0.065em;
}

.page-header p,
.results-heading p {
  margin: 10px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.8rem;
}

.setup-card {
  padding: clamp(20px, 4vw, 34px);
  background: rgba(var(--v-theme-surface), 0.74);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.09);
}

.field-label {
  margin-bottom: 8px;
  font-size: 0.76rem;
  font-weight: 760;
}

.track-loading,
.selected-track {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  gap: 18px;
  align-items: center;
  margin-top: 20px;
}

.track-loading :deep(.v-skeleton-loader:first-child) {
  aspect-ratio: 1;
}

.selected-track img {
  width: 112px;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 15px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.34);
}

.selected-track__copy > span {
  color: rgba(var(--v-theme-on-surface), 0.45);
  font-size: 0.64rem;
  font-weight: 750;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.selected-track h2 {
  margin: 4px 0 5px;
  font-size: clamp(1.25rem, 3vw, 1.75rem);
  letter-spacing: -0.04em;
}

.selected-track p {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.66);
  font-size: 0.8rem;
}

.selected-track p span {
  margin-left: 6px;
  color: rgba(var(--v-theme-on-surface), 0.4);
}

.track-empty,
.track-error {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 18px;
  padding: 18px;
  color: rgba(var(--v-theme-on-surface), 0.54);
  font-size: 0.77rem;
  background: rgba(var(--v-theme-on-surface), 0.035);
  border-radius: 13px;
}

.track-error {
  color: rgb(var(--v-theme-error));
}

.unsupported-alert {
  margin-top: 18px;
}

.generation-controls {
  align-items: flex-end;
  margin-top: 26px;
  padding-top: 24px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.preview-kind {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.preview-kind legend {
  margin-bottom: 9px;
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.72rem;
  font-weight: 750;
}

.preview-kind__options {
  display: flex;
  gap: 9px;
}

.preview-kind__option {
  display: grid;
  grid-template-columns: auto auto;
  gap: 2px 8px;
  min-width: 168px;
  padding: 11px 13px;
  color: rgba(var(--v-theme-on-surface), 0.68);
  text-align: left;
  background: rgba(var(--v-theme-on-surface), 0.025);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 12px;
  cursor: pointer;
}

.preview-kind__option .v-icon {
  grid-row: 1 / 3;
  align-self: center;
}

.preview-kind__option span {
  font-size: 0.75rem;
  font-weight: 760;
}

.preview-kind__option small {
  color: rgba(var(--v-theme-on-surface), 0.43);
  font-size: 0.63rem;
}

.preview-kind__option:hover,
.preview-kind__option:focus-visible {
  border-color: rgba(var(--v-theme-primary), 0.5);
  outline: none;
}

.preview-kind__option--selected {
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.09);
  border-color: rgba(var(--v-theme-primary), 0.72);
  box-shadow: inset 0 0 0 1px rgba(var(--v-theme-primary), 0.14);
}

.batch-error,
.results-section {
  margin-top: 20px;
}

.results-section {
  padding: clamp(20px, 4vw, 32px);
  background: rgba(var(--v-theme-surface), 0.54);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 22px;
}

.results-heading {
  margin-bottom: 20px;
}

.results-heading h2 {
  margin: 0;
  font-size: clamp(1.35rem, 3vw, 1.9rem);
  letter-spacing: -0.045em;
}

.preview-grid-wrap {
  overflow-x: auto;
  padding: 3px 2px 12px;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  min-width: 760px;
}

.preview-card {
  min-width: 0;
  overflow: hidden;
  background: rgba(var(--v-theme-on-surface), 0.035);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 15px;
}

.preview-card__media,
.preview-placeholder {
  display: block;
  width: 100%;
  aspect-ratio: 9 / 16;
  padding: 0;
  overflow: hidden;
  background: #0d0e12;
  border: 0;
}

.preview-card__media {
  position: relative;
  cursor: zoom-in;
}

.preview-card__media video,
.preview-card__media img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-card__expand {
  position: absolute;
  right: 9px;
  bottom: 9px;
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  color: white;
  background: rgba(8, 9, 12, 0.7);
  border-radius: 50%;
  opacity: 0;
  transition: opacity 150ms ease;
}

.preview-card__media:hover .preview-card__expand,
.preview-card__media:focus-visible .preview-card__expand {
  opacity: 1;
}

.preview-placeholder {
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 50% 40%, rgba(var(--v-theme-primary), 0.11), transparent 45%),
    #0d0e12;
}

.preview-card__copy {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  min-height: 56px;
  padding: 11px;
}

.preview-card__copy strong,
.preview-card__copy > span {
  overflow: hidden;
  font-size: 0.68rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-card__copy a {
  display: inline-flex;
  flex: 0 0 auto;
  gap: 3px;
  align-items: center;
  color: rgb(var(--v-theme-primary));
  font-size: 0.62rem;
  font-weight: 720;
  text-decoration: none;
}

.preview-card--loading .preview-card__copy {
  color: rgba(var(--v-theme-on-surface), 0.42);
}

.preview-dialog {
  padding: 18px;
  background: rgb(var(--v-theme-surface));
}

.preview-dialog__heading {
  margin-bottom: 14px;
}

.preview-dialog__heading span {
  color: rgb(var(--v-theme-primary));
  font-size: 0.65rem;
  font-weight: 780;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.preview-dialog__heading h2 {
  margin: 3px 0 0;
  font-size: 1.4rem;
  letter-spacing: -0.04em;
}

.preview-dialog video,
.preview-dialog > img {
  display: block;
  width: min(100%, 360px);
  aspect-ratio: 9 / 16;
  margin: 0 auto;
  object-fit: cover;
  background: #0d0e12;
  border-radius: 14px;
}

@media (max-width: 700px) {
  .content-container {
    padding-top: 24px;
  }

  .page-header,
  .generation-controls,
  .results-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .generate-batch {
    width: 100%;
  }

  .preview-kind,
  .preview-kind__options {
    width: 100%;
  }

  .preview-kind__option {
    flex: 1;
    min-width: 0;
  }

  .track-loading,
  .selected-track {
    grid-template-columns: 82px minmax(0, 1fr);
  }

  .selected-track img {
    width: 82px;
  }
}
</style>
