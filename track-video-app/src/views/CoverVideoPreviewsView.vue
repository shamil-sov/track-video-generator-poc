<template>
  <main>
    <v-container class="page-container content-container">
      <CoverSectionNav />

      <header class="page-header">
        <div>
          <div class="section-kicker">Cover videos</div>
          <h1>Template previews</h1>
          <p>Select a track, then browse two-second template previews generated from its cover.</p>
        </div>
        <v-chip size="small" variant="tonal" prepend-icon="mdi-volume-off">
          Silent · {{ selectedResolution.replace('x', ' × ') }} · {{ selectedFrameRate }} FPS
        </v-chip>
      </header>

      <v-card class="preview-card" rounded="xl" elevation="0">
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
            <a :href="track.trackUrl" target="_blank" rel="noopener">
              Open track
              <v-icon icon="mdi-open-in-new" size="14" />
            </a>
          </div>
        </article>

        <div v-else class="track-empty">
          <v-icon icon="mdi-music-box-multiple-outline" size="32" />
          <span>Choose one of the configured tracks to load its cover and artist.</span>
        </div>
      </v-card>

      <v-alert
        v-if="track && !track.previewSupported"
        type="warning"
        variant="tonal"
        class="unsupported-alert"
      >
        This track uses a profile picture instead of a song-cover image. The preview API only accepts BandLab
        <code>/songs/</code> cover URLs, so template previews are unavailable for this track.
      </v-alert>

      <v-card
        v-if="track?.previewSupported"
        class="template-preview-card"
        rounded="xl"
        elevation="0"
      >
        <div v-if="templatesLoading" class="templates-loading" aria-label="Loading video templates">
          <v-skeleton-loader type="image, article" />
        </div>
        <v-alert v-else-if="templateError || !previewTemplates.length" type="warning" variant="tonal">
          {{ templateError || 'No video templates are currently available.' }}
          <template #append>
            <v-btn size="small" variant="text" @click="retryTemplates">Retry</v-btn>
          </template>
        </v-alert>
        <div v-else class="preview-workspace">
          <CoverPreviewTemplateCarousel
            :templates="previewTemplates"
            :selected-template-id="selectedTemplate"
            :track-name="track.name"
            :cover-url="track.pictureUrl"
            :preview="preview"
            :loading="previewLoading"
            :error="previewError"
            @select="renderTemplatePreview"
          />

          <aside class="preview-config" aria-labelledby="preview-config-heading">
            <div class="preview-config__heading">
              <span>Preview config</span>
              <h2 id="preview-config-heading">Render settings</h2>
              <p>Changing a setting generates a fresh preview.</p>
            </div>

            <fieldset>
              <legend>Resolution</legend>
              <button
                type="button"
                class="config-option"
                data-value="360x640"
                :class="{ 'config-option--selected': selectedResolution === '360x640' }"
                :aria-pressed="selectedResolution === '360x640'"
                @click="setPreviewResolution('360x640')"
              >
                <span>Standard</span>
                <small>360 × 640</small>
              </button>
              <button
                type="button"
                class="config-option"
                data-value="720x1280"
                :class="{ 'config-option--selected': selectedResolution === '720x1280' }"
                :aria-pressed="selectedResolution === '720x1280'"
                @click="setPreviewResolution('720x1280')"
              >
                <span>High</span>
                <small>720 × 1280</small>
              </button>
            </fieldset>

            <fieldset>
              <legend>Frame rate</legend>
              <button
                type="button"
                class="config-option"
                data-value="12"
                :class="{ 'config-option--selected': selectedFrameRate === 12 }"
                :aria-pressed="selectedFrameRate === 12"
                @click="setPreviewFrameRate(12)"
              >
                <span>12 FPS</span>
                <small>Faster render</small>
              </button>
              <button
                type="button"
                class="config-option"
                data-value="24"
                :class="{ 'config-option--selected': selectedFrameRate === 24 }"
                :aria-pressed="selectedFrameRate === 24"
                @click="setPreviewFrameRate(24)"
              >
                <span>24 FPS</span>
                <small>Smoother motion</small>
              </button>
            </fieldset>

            <div class="preview-config__summary">
              <v-icon icon="mdi-timer-outline" size="17" />
              Two seconds · Silent
            </div>
          </aside>
        </div>
      </v-card>
    </v-container>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import CoverPreviewTemplateCarousel from '@/components/CoverPreviewTemplateCarousel.vue'
import CoverSectionNav from '@/components/CoverSectionNav.vue'
import { useVideoTemplates } from '@/composables/useVideoTemplates'
import { COVER_PREVIEW_TRACK_URLS } from '@/data/coverPreviewTracks'
import { createCoverVideoPreview, getCoverPreviewTrack } from '@/services/api'
import type {
  CoverPreviewTrackMetadata,
  CoverVideoPreview,
  CoverVideoPreviewFrameRate,
  CoverVideoPreviewResolution,
  TrackVideoTemplate,
} from '@/types/trackVideo'

const trackOptions = COVER_PREVIEW_TRACK_URLS.map(url => ({ title: url, value: url }))
const selectedTrackUrl = ref<string | null>(null)
const track = ref<CoverPreviewTrackMetadata | null>(null)
const trackLoading = ref(false)
const trackError = ref<string | null>(null)
const selectedTemplate = ref<TrackVideoTemplate>('')
const preview = ref<CoverVideoPreview | null>(null)
const previewLoading = ref(false)
const previewError = ref<string | null>(null)
const selectedResolution = ref<CoverVideoPreviewResolution>('360x640')
const selectedFrameRate = ref<CoverVideoPreviewFrameRate>(12)
const excludedPreviewTemplateIds = new Set<TrackVideoTemplate>(['prism-spectrum', '3d-style'])

const {
  templates: videoTemplates,
  loading: templatesLoading,
  error: templateError,
  loadTemplates,
} = useVideoTemplates()

const previewTemplates = computed(() => (
  videoTemplates.value.filter(template => !excludedPreviewTemplateIds.has(template.id))
))

let trackRequestSequence = 0
let previewRequestSequence = 0
let trackController: AbortController | null = null
let previewController: AbortController | null = null

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

function resetPreview(): void {
  previewRequestSequence += 1
  previewController?.abort()
  previewController = null
  preview.value = null
  previewLoading.value = false
  previewError.value = null
}

async function renderTemplatePreview(templateId: TrackVideoTemplate): Promise<void> {
  selectedTemplate.value = templateId
  if (!track.value?.previewSupported) {
    return
  }

  const requestSequence = ++previewRequestSequence
  previewController?.abort()
  previewController = new AbortController()
  preview.value = null
  previewLoading.value = true
  previewError.value = null

  try {
    const result = await createCoverVideoPreview(
      track.value.pictureUrl,
      templateId,
      {
        resolution: selectedResolution.value,
        frameRate: selectedFrameRate.value,
      },
      previewController.signal,
    )
    if (requestSequence === previewRequestSequence) {
      preview.value = result
    }
  } catch (error) {
    if (requestSequence === previewRequestSequence && !(error instanceof DOMException && error.name === 'AbortError')) {
      previewError.value = errorMessage(error, 'Could not generate this template preview.')
    }
  } finally {
    if (requestSequence === previewRequestSequence) {
      previewLoading.value = false
      previewController = null
    }
  }
}

function setPreviewResolution(resolution: CoverVideoPreviewResolution): void {
  if (selectedResolution.value === resolution) {
    return
  }

  selectedResolution.value = resolution
  if (selectedTemplate.value) {
    void renderTemplatePreview(selectedTemplate.value)
  }
}

function setPreviewFrameRate(frameRate: CoverVideoPreviewFrameRate): void {
  if (selectedFrameRate.value === frameRate) {
    return
  }

  selectedFrameRate.value = frameRate
  if (selectedTemplate.value) {
    void renderTemplatePreview(selectedTemplate.value)
  }
}

async function startInitialPreview(): Promise<void> {
  if (
    !track.value?.previewSupported
    || !previewTemplates.value.length
    || previewLoading.value
    || preview.value
  ) {
    return
  }

  if (!previewTemplates.value.some(template => template.id === selectedTemplate.value)) {
    selectedTemplate.value = previewTemplates.value[0].id
  }
  await renderTemplatePreview(selectedTemplate.value)
}

async function loadTrack(trackUrl: string | null): Promise<void> {
  const requestSequence = ++trackRequestSequence
  trackController?.abort()
  trackController = null
  resetPreview()
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
    if (requestSequence !== trackRequestSequence) {
      return
    }

    track.value = result
    void startInitialPreview()
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

async function retryTemplates(): Promise<void> {
  await loadTemplates()
  await startInitialPreview()
}

watch(selectedTrackUrl, loadTrack)

onMounted(async () => {
  await retryTemplates()
})

onBeforeUnmount(() => {
  trackRequestSequence += 1
  previewRequestSequence += 1
  trackController?.abort()
  previewController?.abort()
})
</script>

<style scoped>
.content-container {
  padding-top: 38px;
  padding-bottom: 80px;
}

.page-header {
  display: flex;
  gap: 20px;
  align-items: flex-end;
  justify-content: space-between;
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

.page-header p {
  margin: 10px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.85rem;
}

.preview-card,
.template-preview-card {
  padding: clamp(20px, 4vw, 34px);
  background: rgba(var(--v-theme-surface), 0.74);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.09);
}

.template-preview-card,
.unsupported-alert {
  margin-top: 18px;
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
  margin: 0 0 11px;
  color: rgba(var(--v-theme-on-surface), 0.66);
  font-size: 0.8rem;
}

.selected-track p span {
  margin-left: 6px;
  color: rgba(var(--v-theme-on-surface), 0.4);
}

.selected-track a {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  color: rgb(var(--v-theme-primary));
  font-size: 0.7rem;
  font-weight: 730;
  text-decoration: none;
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

.templates-loading {
  width: min(100%, 320px);
  margin: 0 auto;
}

.preview-workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px;
  gap: clamp(24px, 4vw, 46px);
  align-items: start;
}

.preview-config {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  background: rgba(var(--v-theme-on-surface), 0.035);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.09);
  border-radius: 16px;
}

.preview-config__heading > span {
  color: rgb(var(--v-theme-primary));
  font-size: 0.63rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.preview-config__heading h2 {
  margin: 4px 0 7px;
  font-size: 1.1rem;
  letter-spacing: -0.035em;
}

.preview-config__heading p {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.7rem;
  line-height: 1.5;
}

.preview-config fieldset {
  display: grid;
  gap: 8px;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.preview-config legend {
  margin-bottom: 8px;
  color: rgba(var(--v-theme-on-surface), 0.72);
  font-size: 0.7rem;
  font-weight: 760;
}

.config-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 11px 12px;
  color: rgba(var(--v-theme-on-surface), 0.68);
  text-align: left;
  background: rgba(var(--v-theme-surface), 0.56);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 10px;
  cursor: pointer;
  transition: 150ms ease;
}

.config-option:hover,
.config-option:focus-visible {
  border-color: rgba(var(--v-theme-on-surface), 0.32);
  outline: none;
}

.config-option--selected {
  color: rgb(var(--v-theme-on-surface));
  background: rgba(var(--v-theme-primary), 0.1);
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.12);
}

.config-option span {
  font-size: 0.72rem;
  font-weight: 760;
}

.config-option small {
  color: rgba(var(--v-theme-on-surface), 0.44);
  font-size: 0.64rem;
}

.preview-config__summary {
  display: flex;
  gap: 7px;
  align-items: center;
  padding-top: 2px;
  color: rgba(var(--v-theme-on-surface), 0.48);
  font-size: 0.67rem;
}

.unsupported-alert code {
  padding: 2px 5px;
  font-size: 0.75rem;
  background: rgba(0, 0, 0, 0.22);
  border-radius: 5px;
}

@media (max-width: 620px) {
  .content-container {
    padding-top: 24px;
  }

  .page-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .track-loading,
  .selected-track {
    grid-template-columns: 82px minmax(0, 1fr);
    gap: 13px;
  }

  .selected-track img {
    width: 82px;
  }
}

@media (max-width: 900px) {
  .preview-workspace {
    grid-template-columns: 1fr;
  }

  .preview-config {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .preview-config__heading,
  .preview-config__summary {
    grid-column: 1 / -1;
  }
}

@media (max-width: 520px) {
  .preview-config {
    display: flex;
  }
}
</style>
