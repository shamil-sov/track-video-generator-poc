<template>
  <main>
    <v-container class="page-container content-container">
      <v-card class="generator-card" rounded="xl" elevation="0">
        <div class="generator-header">
          <div>
            <div class="section-kicker">New generation</div>
            <h2>Pick a track and a look</h2>
          </div>
          <v-chip size="small" variant="tonal" prepend-icon="mdi-clock-fast">
            15 seconds from the start
          </v-chip>
        </div>

        <form @submit.prevent="handleSubmit">
          <v-text-field
            v-model="trackUrl"
            label="BandLab track URL"
            placeholder="https://test.bandlab.com/track/..."
            variant="outlined"
            density="comfortable"
            color="primary"
            prepend-inner-icon="mdi-link-variant"
            :error-messages="trackUrlError"
            :disabled="submitting"
            autocomplete="url"
            @blur="urlTouched = true"
          />

          <div class="field-label">Video style</div>
          <TemplatePicker v-model="selectedTemplate" />

          <div class="overlay-heading">
            <div class="field-label">Text overlay <span>Optional</span></div>
            <span>Up to 40 characters · rendered in uppercase</span>
          </div>
          <div class="overlay-options" role="group" aria-label="Text overlay">
            <button
              v-for="option in textOverlayOptions"
              :key="option.value"
              type="button"
              class="overlay-option"
              :class="{ 'overlay-option--selected': selectedTextOverlay === option.value }"
              :aria-pressed="selectedTextOverlay === option.value"
              :disabled="submitting"
              @click="selectedTextOverlay = option.value"
            >
              {{ option.label }}
            </button>
          </div>

          <v-text-field
            v-if="selectedTextOverlay === 'custom'"
            v-model="customTextOverlay"
            class="custom-overlay-field"
            label="Custom overlay text"
            placeholder="Your message"
            variant="outlined"
            density="comfortable"
            color="primary"
            prepend-inner-icon="mdi-format-text"
            maxlength="40"
            counter="40"
            :error-messages="textOverlayError"
            :disabled="submitting"
            autocomplete="off"
          />

          <div class="generator-footer">
            <p>
              This is a public experiment. The submitted track and generated video appear in the shared history below.
            </p>
            <v-btn
              type="submit"
              color="primary"
              size="large"
              rounded="lg"
              prepend-icon="mdi-creation"
              :loading="submitting"
              :disabled="!isValidTrackUrl || Boolean(textOverlayError)"
            >
              Generate video
            </v-btn>
          </div>
        </form>
      </v-card>

      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        closable
        class="mt-5"
        @click:close="error = null"
      >
        {{ error }}
      </v-alert>

      <section class="library-section">
        <div class="library-header">
          <div>
            <div class="section-kicker">Render history</div>
            <h2>Video library</h2>
          </div>

          <div class="library-actions">
            <span v-if="lastUpdatedAt" class="updated-at">
              Updated {{ formatRelativeDate(lastUpdatedAt.toISOString()) }}
            </span>
            <v-btn
              icon="mdi-refresh"
              variant="tonal"
              size="small"
              aria-label="Refresh jobs"
              :loading="refreshing"
              @click="refreshJobs"
            />
          </div>
        </div>

        <div class="filters">
          <v-text-field
            v-model="search"
            label="Search tracks or job IDs"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            hide-details
            clearable
          />
          <v-select
            v-model="statusFilter"
            :items="statusOptions"
            label="Status"
            variant="outlined"
            density="compact"
            hide-details
          />
          <v-select
            v-model="templateFilter"
            :items="templateOptions"
            label="Style"
            variant="outlined"
            density="compact"
            hide-details
          />
        </div>

        <div class="result-line">
          <span>{{ filteredJobs.length }} {{ filteredJobs.length === 1 ? 'job' : 'jobs' }}</span>
          <span v-if="hasFilters">out of {{ jobs.length }}</span>
        </div>

        <div v-if="loading" class="jobs-grid">
          <v-skeleton-loader
            v-for="index in 6"
            :key="index"
            type="image, article"
            class="job-skeleton"
          />
        </div>

        <div v-else-if="filteredJobs.length" class="jobs-grid">
          <JobCard
            v-for="job in filteredJobs"
            :key="job.jobId"
            :job="job"
          />
        </div>

        <div v-else class="empty-state">
          <div class="empty-state__icon">
            <v-icon :icon="jobs.length ? 'mdi-filter-outline' : 'mdi-movie-open-outline'" size="40" />
          </div>
          <h3>{{ jobs.length ? 'No matching renders' : 'Your first render starts here' }}</h3>
          <p>
            {{ jobs.length
              ? 'Try clearing one of the filters.'
              : 'Paste a public BandLab track above and choose a visual style.' }}
          </p>
          <v-btn
            v-if="hasFilters"
            variant="tonal"
            size="small"
            @click="clearFilters"
          >
            Clear filters
          </v-btn>
        </div>
      </section>
    </v-container>

    <v-snackbar v-model="showSuccess" color="success" :timeout="4500">
      <v-icon icon="mdi-check-circle" class="mr-2" />
      Job created. We’ll refresh this page while it renders.
    </v-snackbar>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import JobCard from '@/components/JobCard.vue'
import TemplatePicker from '@/components/TemplatePicker.vue'
import { useTrackVideoJobs } from '@/composables/useTrackVideoJobs'
import {
  VIDEO_TEMPLATES,
  type TrackVideoJobStatus,
  type TrackVideoTemplate,
} from '@/types/trackVideo'
import { formatRelativeDate } from '@/utils/formatters'

const {
  jobs,
  loading,
  refreshing,
  submitting,
  error,
  lastUpdatedAt,
  loadJobs,
  refreshJobs,
  submitJob,
  stopPolling,
} = useTrackVideoJobs()

const trackUrl = ref('')
const selectedTemplate = ref<TrackVideoTemplate>('orbit')
type TextOverlayChoice = 'none' | 'coming-soon' | 'somethings-cooking' | 'out-now' | 'custom'

const textOverlayOptions: ReadonlyArray<{ label: string, value: TextOverlayChoice }> = [
  { label: 'No overlay', value: 'none' },
  { label: 'Coming soon', value: 'coming-soon' },
  { label: "Something's cooking", value: 'somethings-cooking' },
  { label: 'Out now', value: 'out-now' },
  { label: 'Custom', value: 'custom' },
]

const selectedTextOverlay = ref<TextOverlayChoice>('none')
const customTextOverlay = ref('')
const urlTouched = ref(false)
const showSuccess = ref(false)
const search = ref('')
const statusFilter = ref<'all' | TrackVideoJobStatus>('all')
const templateFilter = ref<'all' | TrackVideoTemplate>('all')

const statusOptions = [
  { title: 'All statuses', value: 'all' },
  { title: 'Queued', value: 'queued' },
  { title: 'Rendering', value: 'processing' },
  { title: 'Ready', value: 'completed' },
  { title: 'Failed', value: 'failed' },
]

const templateOptions = [
  { title: 'All styles', value: 'all' },
  ...VIDEO_TEMPLATES.map(template => ({
    title: template.label,
    value: template.value,
  })),
]

function validateTrackUrl(value: string): string | null {
  if (!value.trim()) {
    return 'A track URL is required.'
  }

  try {
    const url = new URL(value.trim())
    const allowedHosts = ['bandlab.com', 'www.bandlab.com', 'test.bandlab.com']
    const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    const trackPath = new RegExp(`^/track/${uuid}/?$`, 'i')
    const queryEntries = [...url.searchParams.entries()]
    const hasValidQuery = queryEntries.length === 0
      || (
        queryEntries.length === 1
        && queryEntries[0][0] === 'revId'
        && new RegExp(`^${uuid}$`, 'i').test(queryEntries[0][1])
      )

    if (
      url.protocol !== 'https:'
      || !allowedHosts.includes(url.hostname)
      || !trackPath.test(url.pathname)
      || !hasValidQuery
      || url.hash
    ) {
      return 'Use a valid BandLab track URL.'
    }

    return null
  } catch {
    return 'Use a valid BandLab track URL.'
  }
}

const rawTrackUrlError = computed(() => validateTrackUrl(trackUrl.value))
const trackUrlError = computed(() => urlTouched.value ? rawTrackUrlError.value : null)
const isValidTrackUrl = computed(() => rawTrackUrlError.value === null)
const textOverlay = computed(() => {
  if (selectedTextOverlay.value === 'custom') {
    return customTextOverlay.value.trim() || undefined
  }
  if (selectedTextOverlay.value === 'none') {
    return undefined
  }

  return textOverlayOptions.find(option => option.value === selectedTextOverlay.value)?.label
})
const textOverlayError = computed(() => {
  if (selectedTextOverlay.value !== 'custom') {
    return null
  }
  if (/\r|\n/.test(customTextOverlay.value)) {
    return 'Use a single line of text.'
  }
  if (customTextOverlay.value.trim().length > 40) {
    return 'Use no more than 40 characters.'
  }

  return null
})
const hasFilters = computed(() => (
  search.value.trim().length > 0
  || statusFilter.value !== 'all'
  || templateFilter.value !== 'all'
))

const filteredJobs = computed(() => {
  const query = search.value.trim().toLowerCase()

  return jobs.value.filter(job => {
    if (statusFilter.value !== 'all' && job.status !== statusFilter.value) {
      return false
    }
    if (templateFilter.value !== 'all' && job.template !== templateFilter.value) {
      return false
    }
    if (!query) {
      return true
    }

    return [
      job.track?.name,
      job.track?.genre,
      job.jobId,
      job.postId,
      job.revisionId,
    ].some(value => value?.toLowerCase().includes(query))
  })
})

async function handleSubmit(): Promise<void> {
  urlTouched.value = true
  if (!isValidTrackUrl.value) {
    return
  }

  const created = await submitJob(trackUrl.value.trim(), selectedTemplate.value, textOverlay.value)
  if (created) {
    showSuccess.value = true
    trackUrl.value = ''
    selectedTextOverlay.value = 'none'
    customTextOverlay.value = ''
    urlTouched.value = false
  }
}

function clearFilters(): void {
  search.value = ''
  statusFilter.value = 'all'
  templateFilter.value = 'all'
}

onMounted(() => {
  void loadJobs()
})

onBeforeUnmount(stopPolling)
</script>

<style scoped>
.content-container {
  padding-top: 38px;
  padding-bottom: 80px;
}

.generator-card {
  position: relative;
  z-index: 2;
  padding: 28px;
  background:
    linear-gradient(135deg, rgba(var(--v-theme-primary), 0.05), transparent 32%),
    rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.2) !important;
}

.generator-header,
.library-header {
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 25px;
}

.section-kicker {
  margin-bottom: 5px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.13em;
}

.generator-header h2,
.library-header h2 {
  margin: 0;
  font-size: clamp(1.6rem, 3vw, 2.25rem);
  line-height: 1.1;
  letter-spacing: -0.045em;
}

.field-label {
  margin: 4px 0 10px;
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.74rem;
  font-weight: 750;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.field-label span {
  margin-left: 6px;
  color: rgba(var(--v-theme-on-surface), 0.35);
  font-weight: 650;
}

.overlay-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 24px;
}

.overlay-heading > span {
  color: rgba(var(--v-theme-on-surface), 0.42);
  font-size: 0.7rem;
}

.overlay-options {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 9px;
}

.overlay-option {
  min-height: 46px;
  padding: 8px 12px;
  color: rgba(var(--v-theme-on-surface), 0.66);
  font: inherit;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  background: rgba(var(--v-theme-on-surface), 0.025);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 12px;
  transition: 150ms ease;
}

.overlay-option:hover:not(:disabled) {
  color: rgb(var(--v-theme-on-surface));
  border-color: rgba(var(--v-theme-primary), 0.48);
}

.overlay-option--selected {
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.09);
  border-color: rgba(var(--v-theme-primary), 0.7);
  box-shadow: inset 0 0 0 1px rgba(var(--v-theme-primary), 0.18);
}

.overlay-option:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

.overlay-option:disabled {
  cursor: default;
  opacity: 0.5;
}

.custom-overlay-field {
  margin-top: 12px;
}

.generator-footer {
  display: flex;
  gap: 28px;
  align-items: center;
  justify-content: space-between;
  margin-top: 22px;
}

.generator-footer p {
  max-width: 590px;
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.52);
  font-size: 0.76rem;
  line-height: 1.5;
}

.library-section {
  margin-top: 62px;
}

.library-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.updated-at {
  color: rgba(var(--v-theme-on-surface), 0.48);
  font-size: 0.72rem;
}

.filters {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) 190px 190px;
  gap: 12px;
  padding: 14px;
  background: rgba(var(--v-theme-surface), 0.56);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 16px;
}

.result-line {
  display: flex;
  gap: 5px;
  margin: 18px 2px 12px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.76rem;
}

.jobs-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.job-skeleton {
  overflow: hidden;
  border-radius: 18px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 72px 24px;
  text-align: center;
  background: rgba(var(--v-theme-surface), 0.52);
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.14);
  border-radius: 20px;
}

.empty-state__icon {
  display: grid;
  place-items: center;
  width: 76px;
  height: 76px;
  margin-bottom: 17px;
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.1);
  border-radius: 24px;
}

.empty-state h3 {
  margin: 0;
  font-size: 1.15rem;
}

.empty-state p {
  max-width: 430px;
  margin: 8px 0 18px;
  color: rgba(var(--v-theme-on-surface), 0.52);
  font-size: 0.87rem;
}

@media (max-width: 900px) {
  .filters {
    grid-template-columns: 1fr 1fr;
  }

  .filters > :first-child {
    grid-column: 1 / -1;
  }

  .jobs-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .overlay-options {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .generator-card {
    padding: 20px;
  }

  .generator-header,
  .generator-footer,
  .library-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .generator-footer .v-btn {
    width: 100%;
  }

  .filters,
  .jobs-grid {
    grid-template-columns: 1fr;
  }

  .overlay-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .overlay-options {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filters > :first-child {
    grid-column: auto;
  }

  .updated-at {
    display: none;
  }
}
</style>
