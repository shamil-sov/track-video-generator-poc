<template>
  <main class="production-track-videos">
    <v-container class="page-container production-content">
      <header class="production-heading">
        <h1>Track videos</h1>
        <span>{{ selectedEnvironment.label }} environment</span>
      </header>

      <section class="production-panel authentication-panel" aria-labelledby="authentication-heading">
        <h2 id="authentication-heading">API access</h2>
        <div class="environment-selector" role="group" aria-label="API environment">
          <button
            v-for="(option, key) in TRACK_VIDEO_ENVIRONMENTS" :key="key"
            type="button" class="environment-option" :data-environment="key"
            :aria-pressed="environment === key" :disabled="active || downloading"
            @click="selectEnvironment(key)"
          >{{ option.label }}</button>
        </div>
        <p class="api-endpoint">{{ selectedEnvironment.baseUrl }}/track-videos</p>
        <p v-if="environment === 'production'" class="production-notice" role="status">
          Production selected. Previews and video generation use the live service.
        </p>
        <form class="token-form" autocomplete="off" @submit.prevent="useToken">
          <v-text-field
            v-model="tokenInput"
            label="BandLab bearer token"
            type="password" autocomplete="off" :spellcheck="false"
            :disabled="active"
            variant="outlined" density="comfortable" hide-details
          />
          <v-btn type="submit" color="primary" :disabled="active || !normalizedTokenInput || normalizedTokenInput === bearerToken">Use token</v-btn>
          <v-btn v-if="bearerToken" variant="text" :disabled="active" @click="clearToken">Clear token</v-btn>
        </form>
        <p class="token-note" role="status">
          {{ bearerToken ? 'Token set for this page.' : 'A token is required for previews and video generation.' }}
          Use a {{ selectedEnvironment.label }} BandLab token. Kept in memory only; cleared when you switch environments, leave, or refresh.
        </p>
      </section>

      <v-card class="production-panel" rounded="xl" elevation="0">
        <h2>Track</h2>
        <h3 id="preset-tracks-heading" class="preset-tracks-heading">Preset tracks</h3>
        <div class="track-presets" role="group" aria-labelledby="preset-tracks-heading">
          <button
            v-for="preset in PRODUCTION_TRACK_PRESETS" :key="preset.url"
            type="button" class="track-preset"
            :aria-pressed="trackUrlInput.trim() === preset.url"
            :disabled="active"
            @click="choosePreset(preset.url)"
          >{{ preset.name }}</button>
        </div>
        <p class="custom-track-label">Or paste your own track URL</p>
        <form class="track-url-form" @submit.prevent="loadTrack(trackUrlInput)">
          <v-text-field
            v-model="trackUrlInput"
            label="BandLab track URL"
            placeholder="https://www.bandlab.com/track/..."
            :disabled="active"
            variant="outlined"
            density="comfortable"
            hide-details
          />
          <v-btn type="submit" color="primary" :disabled="active || !trackUrlInput.trim()" :loading="trackLoading">Load track</v-btn>
        </form>
        <p v-if="track && trackUrlInput.trim() !== loadedTrackUrl" class="pending-track-url">Load the updated URL before generating.</p>

        <v-alert v-if="trackError" type="error" variant="tonal" class="inline-alert">{{ trackError }}</v-alert>
        <div v-if="trackLoading" class="track-loading" role="status"><v-progress-circular indeterminate size="24" /> Loading track…</div>
        <article v-else-if="track" class="production-source">
          <img :src="track.pictureUrl" :alt="`${track.name} cover`" />
          <div><h3>{{ track.name }}</h3><p>{{ track.artistName }}</p><span>{{ segmentTime(track.durationSeconds) }}</span></div>
        </article>

        <TrackSegmentPicker
          v-if="track"
          :key="track.revisionId"
          v-model="startTime"
          class="source-segment"
          :audio-url="track.audioUrl"
          :duration-seconds="track.durationSeconds"
          :disabled="active || showGeneration"
        />
      </v-card>

      <section class="production-panel templates-panel" aria-labelledby="production-template-heading">
        <div class="template-heading">
          <h2 id="production-template-heading">Template</h2>
          <v-btn
            v-if="track && bearerToken"
            variant="text" size="small"
            :disabled="active || previewsLoading" :loading="previewsLoading"
            @click="loadPreviews"
          >{{ previews.length ? 'Refresh previews' : 'Generate previews' }}</v-btn>
        </div>

        <div class="selected-template-layout">
          <div class="production-preview">
            <div v-if="previewsLoading" class="preview-message" role="status">
              <v-progress-circular indeterminate color="primary" />
              <span>Generating five previews…</span>
            </div>
            <video
              v-else-if="selectedPreview"
              :key="selectedPreview.videoPreviewUrl"
              ref="templateVideo"
              :src="selectedPreview.videoPreviewUrl"
              :poster="selectedPreview.picture.url"
              :autoplay="!showGeneration" muted loop playsinline controls
              :aria-label="`${selectedTemplate.name} template preview`"
              @error="previewPlaybackError = 'This preview could not be played. Try refreshing the previews.'"
            />
            <div v-else class="preview-message">
              <v-icon icon="mdi-motion-play-outline" size="36" />
              <span>{{ !track ? 'Load a track to preview templates' : !bearerToken ? 'Set a BandLab token to generate previews' : 'Preview unavailable' }}</span>
            </div>
          </div>
          <div class="selected-template-copy">
            <span class="selected-label">Selected template</span>
            <h3>{{ selectedTemplate.name }}</h3>
            <p>Video: 720 × 1280 · 24 FPS</p>
            <p v-if="track && validStart">Segment: {{ segmentTime(Number(startTime)) }} → {{ segmentTime(segmentEnd) }}</p>
            <p class="preview-note">Template previews are silent. The generated video includes your selected audio segment.</p>
            <v-btn
              class="production-generate" color="primary" size="large" prepend-icon="mdi-movie-open-outline"
              :disabled="!canGenerate" @click="generateVideo"
            >{{ environment === 'production' ? 'Generate in Production' : 'Generate video' }}</v-btn>
            <v-btn v-if="job?.status === 'completed'" class="last-result" variant="text" @click="showGeneration = true">View generated video</v-btn>
          </div>
        </div>

        <v-alert v-if="previewError || previewPlaybackError" type="error" variant="tonal" class="inline-alert">
          {{ previewError || previewPlaybackError }}
        </v-alert>
        <div class="production-template-options" role="group" aria-label="Video templates">
          <button
            v-for="template in TRACK_VIDEO_TEMPLATES" :key="template.id"
            type="button" class="production-template-option"
            :class="{ 'production-template-option--selected': selectedTemplateId === template.id }"
            :aria-pressed="selectedTemplateId === template.id" :disabled="active"
            @click="selectedTemplateId = template.id; previewPlaybackError = null"
          >
            <img
              v-if="previewFor(template.id) && !previewsLoading"
              :src="previewFor(template.id)!.picture.url" :alt="`${template.name} preview`"
            />
            <div v-else class="template-placeholder"><v-icon icon="mdi-movie-outline" size="24" /></div>
            <span>{{ template.name }}</span>
            <v-icon v-if="selectedTemplateId === template.id" class="template-check" icon="mdi-check-circle" size="20" />
          </button>
        </div>
      </section>
      <p class="session-note">This page keeps only the current result. Download it before leaving or refreshing.</p>
    </v-container>

    <v-dialog v-model="showGeneration" :persistent="active" max-width="470">
      <v-card class="generation-dialog" rounded="xl">
        <div class="generation-heading">
          <div><h2>{{ job?.status === 'completed' ? 'Video ready' : generationFailure ? 'Generation failed' : 'Generating video' }}</h2><p>{{ generationName }}</p></div>
          <v-btn v-if="!active" icon="mdi-close" variant="text" aria-label="Close generated video" @click="showGeneration = false" />
        </div>
        <div class="generation-player">
          <video
            v-if="job?.status === 'completed'"
            :key="job.videoUrl" ref="resultVideo" :src="job.videoUrl"
            autoplay controls playsinline loop aria-label="Generated track video"
            @loadeddata="autoplayResult" @error="resultPlaybackError = 'The video could not be loaded. Try the video link below.'"
          />
          <div v-else class="preview-message" role="status" aria-live="polite">
            <v-icon v-if="generationFailure" icon="mdi-alert-circle-outline" color="error" size="36" />
            <v-progress-circular v-else indeterminate color="primary" size="36" />
            <strong>{{ generationFailure || (submitting ? 'Starting generation…' : job?.status === 'queued' ? 'Queued' : 'Rendering your video…') }}</strong>
            <span v-if="active">{{ elapsedSeconds }} seconds elapsed</span>
          </div>
        </div>
        <p class="generation-summary">{{ generationSummary }}</p>
        <p v-if="job" class="job-reference">Job: {{ job.jobId }}</p>
        <v-alert v-if="pollingError" type="warning" variant="tonal" class="inline-alert">
          {{ pollingError }} {{ polling ? 'Retrying status check…' : 'Resume checking this job below.' }}
        </v-alert>
        <v-btn v-if="pollingError && !polling" class="dialog-action" color="primary" @click="retryStatus">Retry status check</v-btn>
        <p v-if="autoplayMuted" class="generation-note">Playing muted because the browser blocked audio autoplay. Use the player to unmute.</p>
        <p v-if="resultPlaybackError" class="generation-note" role="alert">{{ resultPlaybackError }}</p>
        <template v-if="job?.status === 'completed'">
          <v-btn class="dialog-action" color="primary" prepend-icon="mdi-download" :loading="downloading" @click="downloadVideo">Download video</v-btn>
          <a class="video-link" :href="job.videoUrl" target="_blank" rel="noopener">Open video file</a>
          <p v-if="downloadError" class="generation-note" role="alert">{{ downloadError }}</p>
        </template>
        <v-btn v-if="active" class="dialog-action" variant="text" @click="stopWaiting">Stop waiting</v-btn>
        <p v-if="active" class="generation-note">Leaving this screen stops checking the job; server generation may continue.</p>
      </v-card>
    </v-dialog>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import TrackSegmentPicker from '@/components/TrackSegmentPicker.vue'
import { useProductionGeneration } from '@/composables/useProductionGeneration'
import { PRODUCTION_TRACK_PRESETS } from '@/data/productionTrackPresets'
import { createProductionPreviews, resolveProductionTrack, TRACK_VIDEO_ENVIRONMENTS } from '@/services/productionTrackVideo'
import { TRACK_VIDEO_TEMPLATES, segmentDuration, segmentTime, validSegmentStart } from '@/types/productionTrackVideo'
import type { ProductionTemplateId, ProductionTrack, ProductionTrackPreview } from '@/types/productionTrackVideo'

const environment = ref<keyof typeof TRACK_VIDEO_ENVIRONMENTS>('uat')
const selectedEnvironment = computed(() => TRACK_VIDEO_ENVIRONMENTS[environment.value])
const tokenInput = ref('')
const bearerToken = ref('')
const normalizedTokenInput = computed(() => tokenInput.value.trim().replace(/^Bearer(?:\s+|$)/i, '').trim())
const trackUrlInput = ref('')
const loadedTrackUrl = ref('')
const track = ref<ProductionTrack | null>(null)
const trackLoading = ref(false)
const trackError = ref<string | null>(null)
const previews = ref<ProductionTrackPreview[]>([])
const previewsLoading = ref(false)
const previewError = ref<string | null>(null)
const previewPlaybackError = ref<string | null>(null)
const selectedTemplateId = ref<ProductionTemplateId>('audio-ring')
const selectedTemplate = computed(() => TRACK_VIDEO_TEMPLATES.find(template => template.id === selectedTemplateId.value)!)
const selectedPreview = computed(() => previewFor(selectedTemplateId.value))
const startTime = ref<number | string | null>(0)
const validStart = computed(() => track.value !== null && validSegmentStart(startTime.value, track.value.durationSeconds))
const segmentEnd = computed(() => Number(startTime.value) + segmentDuration(track.value?.durationSeconds || 0, Number(startTime.value)))
const { job, active, submitting, error, pollingError, polling, generate, retryStatus, reset } = useProductionGeneration()
const canGenerate = computed(() => bearerToken.value && track.value && validStart.value
  && trackUrlInput.value.trim() === loadedTrackUrl.value && !trackLoading.value && !active.value)
const showGeneration = ref(false)
const generationName = ref('')
const generationSummary = ref('')
const generationFailure = computed(() => error.value || (job.value?.status === 'failed' ? job.value.error.message : null))
const elapsedSeconds = ref(0)
const templateVideo = ref<HTMLVideoElement | null>(null)
const resultVideo = ref<HTMLVideoElement | null>(null)
const autoplayMuted = ref(false)
const resultPlaybackError = ref<string | null>(null)
const downloading = ref(false)
const downloadError = ref<string | null>(null)
let trackSequence = 0
let previewSequence = 0
let trackController: AbortController | null = null
let previewController: AbortController | null = null
let downloadController: AbortController | null = null
let elapsedTimer: ReturnType<typeof setInterval> | null = null

function previewFor(templateId: ProductionTemplateId): ProductionTrackPreview | undefined {
  return previews.value.find(preview => preview.templateId === templateId)
}

function selectEnvironment(value: keyof typeof TRACK_VIDEO_ENVIRONMENTS): void {
  if (active.value || downloading.value || value === environment.value) return
  templateVideo.value?.pause()
  resultVideo.value?.pause()
  trackSequence += 1
  trackController?.abort()
  clearToken()
  track.value = null
  trackLoading.value = false
  trackError.value = null
  trackUrlInput.value = ''
  loadedTrackUrl.value = ''
  startTime.value = 0
  selectedTemplateId.value = 'audio-ring'
  generationName.value = ''
  generationSummary.value = ''
  elapsedSeconds.value = 0
  autoplayMuted.value = false
  resultPlaybackError.value = null
  downloadError.value = null
  environment.value = value
}

function clearToken(): void {
  if (active.value) return
  bearerToken.value = ''
  tokenInput.value = ''
  previewSequence += 1
  previewController?.abort()
  previews.value = []
  previewsLoading.value = false
  previewError.value = null
  previewPlaybackError.value = null
  stopWaiting()
}

function useToken(): void {
  if (active.value || !normalizedTokenInput.value) return
  const token = normalizedTokenInput.value
  clearToken()
  bearerToken.value = token
  tokenInput.value = token
  if (track.value) void loadPreviews()
}

function choosePreset(value: string): void {
  if (active.value) return
  trackUrlInput.value = value
  void loadTrack(value)
}

async function loadTrack(url: string): Promise<void> {
  if (active.value) return
  const sequence = ++trackSequence
  trackController?.abort()
  previewSequence += 1
  previewController?.abort()
  trackController = new AbortController()
  trackLoading.value = true
  track.value = null
  previews.value = []
  previewsLoading.value = false
  trackError.value = null
  previewError.value = null
  previewPlaybackError.value = null
  startTime.value = 0
  showGeneration.value = false
  reset()
  try {
    const resolved = await resolveProductionTrack(url, trackController.signal)
    if (sequence !== trackSequence) return
    track.value = resolved
    loadedTrackUrl.value = url.trim()
    void loadPreviews()
  } catch (cause) {
    if (sequence === trackSequence) trackError.value = cause instanceof Error ? cause.message : 'Could not load this track.'
  } finally {
    if (sequence === trackSequence) trackLoading.value = false
  }
}

async function loadPreviews(): Promise<void> {
  if (!track.value || !bearerToken.value || active.value) return
  const sequence = ++previewSequence
  previewController?.abort()
  previewController = new AbortController()
  previews.value = []
  previewsLoading.value = true
  previewError.value = null
  previewPlaybackError.value = null
  try {
    const result = await createProductionPreviews(selectedEnvironment.value.baseUrl, track.value.pictureUrl, bearerToken.value, previewController.signal)
    if (sequence === previewSequence) previews.value = result
  } catch (cause) {
    if (sequence === previewSequence) previewError.value = cause instanceof Error ? cause.message : 'Could not generate previews.'
  } finally {
    if (sequence === previewSequence) previewsLoading.value = false
  }
}

function clearElapsedTimer(): void {
  if (elapsedTimer !== null) clearInterval(elapsedTimer)
  elapsedTimer = null
}

async function generateVideo(): Promise<void> {
  if (!canGenerate.value || !track.value) return
  templateVideo.value?.pause()
  generationName.value = track.value.name
  generationSummary.value = `${selectedEnvironment.value.label} · ${selectedTemplate.value.name} · ${segmentTime(Number(startTime.value))} → ${segmentTime(segmentEnd.value)}`
  autoplayMuted.value = false
  resultPlaybackError.value = null
  downloadError.value = null
  elapsedSeconds.value = 0
  clearElapsedTimer()
  const started = Date.now()
  elapsedTimer = setInterval(() => { elapsedSeconds.value = Math.floor((Date.now() - started) / 1000) }, 1000)
  showGeneration.value = true
  await generate(selectedEnvironment.value.baseUrl, {
    trackCoverUrl: track.value.pictureUrl,
    trackAudioUrl: track.value.audioUrl,
    templateId: selectedTemplateId.value,
    startTimeSeconds: Number(startTime.value),
  }, bearerToken.value)
}

async function autoplayResult(): Promise<void> {
  const video = resultVideo.value
  if (!video || !showGeneration.value) return
  try {
    await video.play()
  } catch {
    if (video !== resultVideo.value || !showGeneration.value) return
    video.muted = true
    autoplayMuted.value = true
    try { await video.play() } catch { resultPlaybackError.value = 'Press Play to start the video.' }
  }
}

async function downloadVideo(): Promise<void> {
  if (job.value?.status !== 'completed' || downloading.value) return
  downloading.value = true
  downloadError.value = null
  downloadController = new AbortController()
  try {
    const response = await fetch(job.value.videoUrl, { signal: downloadController.signal })
    if (!response.ok) throw new Error('Download failed')
    const url = URL.createObjectURL(await response.blob())
    const link = document.createElement('a')
    link.href = url
    link.download = `${generationName.value.replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'track'}-video.mp4`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch {
    downloadError.value = 'Download could not start. Use Open video file and save from the player.'
  } finally {
    downloading.value = false
  }
}

function stopWaiting(): void {
  reset()
  showGeneration.value = false
  clearElapsedTimer()
}

watch(active, running => { if (!running) clearElapsedTimer() })
watch(showGeneration, async visible => {
  if (!visible) resultVideo.value?.pause()
  else {
    templateVideo.value?.pause()
    await nextTick()
    if (job.value?.status === 'completed') void autoplayResult()
  }
})
onBeforeUnmount(() => {
  bearerToken.value = ''
  tokenInput.value = ''
  trackSequence += 1
  previewSequence += 1
  trackController?.abort()
  previewController?.abort()
  downloadController?.abort()
  templateVideo.value?.pause()
  resultVideo.value?.pause()
  clearElapsedTimer()
})
</script>

<style scoped>
.production-content { padding-top: 30px; padding-bottom: 50px; }
.production-heading, .template-heading, .generation-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.production-heading { margin-bottom: 22px; }
.production-heading h1 { font-size: 2rem; letter-spacing: -0.04em; }
.production-heading > span, .session-note { color: rgba(var(--v-theme-on-surface), .55); font-size: .875rem; }
.production-panel { padding: 24px; margin-bottom: 20px; border: 1px solid rgba(var(--v-theme-on-surface), .09); background: rgb(var(--v-theme-surface)); border-radius: 20px; }
.production-panel h2 { font-size: 1.15rem; }
.environment-selector { display: flex; gap: 8px; margin-top: 16px; }
.environment-option { padding: 9px 18px; border: 1px solid rgba(var(--v-theme-on-surface), .2); border-radius: 9px; font: inherit; background: transparent; color: rgb(var(--v-theme-on-surface)); cursor: pointer; }
.environment-option[aria-pressed="true"] { border-color: rgb(var(--v-theme-primary)); background: rgba(var(--v-theme-primary), .15); }
.environment-option:focus-visible { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: 2px; }
.environment-option:disabled { opacity: .45; cursor: default; }
.api-endpoint { margin-top: 10px; font-family: monospace; font-size: .8rem; overflow-wrap: anywhere; color: rgba(var(--v-theme-on-surface), .65); }
.production-notice { margin-top: 12px; padding: 10px 12px; border-left: 3px solid rgb(var(--v-theme-primary)); background: rgba(var(--v-theme-primary), .1); font-size: .875rem; }
.token-form { display: flex; align-items: center; gap: 12px; margin-top: 16px; flex-wrap: wrap; }
.token-form :deep(.v-input) { min-width: 220px; flex: 1; }
.token-note { margin-top: 12px; color: rgba(var(--v-theme-on-surface), .65); font-size: .875rem; }
.preset-tracks-heading { margin: 18px 0 10px; font-size: .875rem; font-weight: 600; }
.track-presets { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 8px; }
.track-preset { padding: 10px 12px; text-align: left; font: inherit; font-size: .875rem; line-height: 1.4; border: 1px solid rgba(var(--v-theme-on-surface), .16); border-radius: 10px; background: transparent; color: rgb(var(--v-theme-on-surface)); cursor: pointer; }
.track-preset:hover:not(:disabled), .track-preset[aria-pressed="true"] { border-color: rgb(var(--v-theme-primary)); background: rgba(var(--v-theme-primary), .12); }
.track-preset:focus-visible { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: 2px; }
.track-preset:disabled { opacity: .45; cursor: default; }
.custom-track-label { margin: 18px 0 10px; font-size: .875rem; color: rgba(var(--v-theme-on-surface), .65); }
.pending-track-url { font-size: .875rem; color: rgba(var(--v-theme-on-surface), .65); margin-top: 12px; }
.track-url-form { display: flex; gap: 12px; align-items: center; }
.track-url-form :deep(.v-input) { min-width: 0; }
.track-loading, .production-source { display: flex; align-items: center; gap: 18px; margin-top: 20px; }
.production-source img { height: 80px; width: 80px; border-radius: 12px; object-fit: cover; }
.production-source h3 { font-size: 1.25rem; }
.production-source p, .production-source span { color: rgba(var(--v-theme-on-surface), .6); font-size: .875rem; }
.source-segment { margin-top: 24px; padding-top: 24px; border-top: 1px solid rgba(var(--v-theme-on-surface), .09); }
.selected-template-layout { display: grid; grid-template-columns: minmax(180px, 260px) minmax(0, 1fr); align-items: center; gap: 40px; max-width: 750px; margin: 22px auto; }
.production-preview, .generation-player { aspect-ratio: 9 / 16; background: #08090c; overflow: hidden; border-radius: 15px; }
.production-preview video, .generation-player video { display: block; width: 100%; height: 100%; object-fit: contain; }
.preview-message { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; text-align: center; height: 100%; padding: 24px; font-size: .875rem; color: rgba(var(--v-theme-on-surface), .65); }
.selected-label { color: rgb(var(--v-theme-primary)); font-size: .875rem; }
.selected-template-copy h3 { font-size: 1.65rem; margin: 6px 0 16px; letter-spacing: -.03em; }
.selected-template-copy p { color: rgba(var(--v-theme-on-surface), .6); font-size: .875rem; margin: 9px 0; }
.selected-template-copy .preview-note { margin: 22px 0; line-height: 1.6; }
.production-generate, .last-result { width: 100%; }
.production-template-options { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin-top: 25px; }
.production-template-option { position: relative; padding: 8px; border: 1px solid rgba(var(--v-theme-on-surface), .14); border-radius: 13px; text-align: left; background: rgba(var(--v-theme-on-surface), .02); }
.production-template-option:not(:disabled) { cursor: pointer; }
.production-template-option:focus-visible { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: 3px; }
.production-template-option--selected { border-color: rgb(var(--v-theme-primary)); background: rgba(var(--v-theme-primary), .08); }
.production-template-option img, .template-placeholder { display: block; width: 100%; aspect-ratio: 9 / 16; object-fit: cover; border-radius: 8px; background: #0c0d11; }
.template-placeholder { display: grid; place-items: center; color: rgba(var(--v-theme-on-surface), .3); }
.production-template-option > span { display: block; font-size: .875rem; margin: 10px 2px 3px; }
.template-check { position: absolute; right: 13px; top: 13px; color: rgb(var(--v-theme-primary)); background: #101116; border-radius: 50%; }
.inline-alert { margin: 18px 0; }
.generation-dialog { padding: 22px; }
.generation-heading { margin-bottom: 18px; }
.generation-heading h2 { font-size: 1.3rem; }
.generation-heading p, .generation-note, .generation-summary, .job-reference { font-size: .875rem; color: rgba(var(--v-theme-on-surface), .6); }
.generation-heading p { margin-top: 5px; }
.generation-player { width: min(100%, 320px); margin: auto; }
.generation-summary { margin-top: 15px; }
.job-reference { font-size: .75rem; overflow-wrap: anywhere; margin-top: 6px; }
.dialog-action { margin-top: 16px; width: 100%; }
.generation-note { margin-top: 14px; }
.video-link { display: block; margin: 16px 0 0; color: rgb(var(--v-theme-primary)); text-align: center; font-size: .875rem; }
@media (max-width: 620px) {
  .production-panel { padding: 16px; }
  .production-heading { align-items: flex-start; flex-direction: column; gap: 6px; }
  .track-url-form { flex-direction: column; align-items: stretch; }
  .selected-template-layout { grid-template-columns: 1fr; gap: 20px; }
  .production-preview { width: min(100%, 230px); margin: auto; }
  .production-template-options { display: flex; overflow-x: auto; padding: 3px 2px 12px; }
  .production-template-option { flex: 0 0 125px; }
}
</style>
