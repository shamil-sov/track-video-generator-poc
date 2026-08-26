<template>
  <main class="ai-page">
    <v-container class="page-container content-container">
      <v-card class="generator-card" rounded="xl" elevation="0">
        <div class="generator-header">
          <div>
            <div class="section-kicker">New AI-image generation</div>
            <h2>Start with a track</h2>
          </div>
          <v-chip size="small" variant="tonal" prepend-icon="mdi-clock-fast">
            15 seconds from the start
          </v-chip>
        </div>

        <form class="track-start-form" @submit.prevent="handleSubmit">
          <div class="track-url-field">
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
            <p>Choose the motion template and AI visual style below.</p>
          </div>

          <div class="field-heading">
            <div>
              <span>Video template</span>
              <small>Select a template to preview its motion.</small>
            </div>
          </div>

          <div v-if="cataloguesLoading" class="template-loading">
            <v-skeleton-loader v-for="index in 4" :key="index" type="image, article" />
          </div>
          <AiVideoTemplatePicker
            v-else-if="videoTemplates.length"
            v-model="selectedTemplate"
            :templates="videoTemplates"
          />
          <v-alert v-else type="warning" variant="tonal" density="compact">
            Video templates are currently unavailable. Refresh to try loading the catalogue again.
          </v-alert>

          <div class="field-heading field-heading--visual">
            <div>
              <span>AI visual style</span>
              <small>Browse the example images, then choose the art direction.</small>
            </div>
          </div>

          <div v-if="cataloguesLoading" class="style-loading">
            <v-skeleton-loader type="image, article" />
            <div>
              <v-skeleton-loader v-for="index in 6" :key="index" type="image" />
            </div>
          </div>
          <AiVisualStylePicker
            v-else-if="visualStyles.length"
            v-model="selectedVisualStyle"
            :styles="visualStyles"
          />
          <v-alert v-else type="warning" variant="tonal" density="compact">
            Visual styles are currently unavailable. Refresh to try loading the catalogue again.
          </v-alert>

          <div class="generator-footer">
            <p>Creates a 15-second video from the start of the track.</p>
            <v-btn
              type="submit"
              color="primary"
              size="large"
              rounded="lg"
              prepend-icon="mdi-image-sparkles-outline"
              :loading="submitting"
              :disabled="submitting || cataloguesLoading || !selectedTemplate || !selectedVisualStyle"
            >
              Generate
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
        @click:close="clearError"
      >
        {{ error }}
      </v-alert>

      <section class="library-section">
        <div class="library-header">
          <div>
            <div class="section-kicker">AI-image render history</div>
            <h2>AI video library</h2>
            <p>This list is separate from cover-based video jobs.</p>
          </div>

          <div class="library-actions">
            <span v-if="lastUpdatedAt" class="updated-at">
              Updated {{ formatRelativeDate(lastUpdatedAt.toISOString()) }}
            </span>
            <v-btn
              icon="mdi-refresh"
              variant="tonal"
              size="small"
              aria-label="Refresh AI-image jobs"
              :loading="refreshing"
              @click="refreshAll"
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
            :items="templateFilterOptions"
            label="Template"
            variant="outlined"
            density="compact"
            hide-details
          />
          <v-select
            v-model="styleFilter"
            :items="styleFilterOptions"
            label="Visual style"
            variant="outlined"
            density="compact"
            hide-details
          />
        </div>

        <div class="result-line">
          <span>{{ filteredJobs.length }} {{ filteredJobs.length === 1 ? 'job' : 'jobs' }}</span>
          <span v-if="hasFilters">out of {{ jobs.length }}</span>
          <span>· latest 50</span>
        </div>

        <div v-if="jobsLoading" class="jobs-grid">
          <v-skeleton-loader
            v-for="index in 6"
            :key="index"
            type="image, article"
            class="job-skeleton"
          />
        </div>

        <div v-else-if="filteredJobs.length" class="jobs-grid">
          <AiImageJobCard
            v-for="job in filteredJobs"
            :key="job.jobId"
            :job="job"
            :template-name="templateName(job.template)"
            :visual-style-name="visualStyleName(job.visualStyle)"
          />
        </div>

        <div v-else class="empty-state">
          <div class="empty-state__icon">
            <v-icon :icon="jobs.length ? 'mdi-filter-outline' : 'mdi-image-sparkles-outline'" size="40" />
          </div>
          <h3>{{ jobs.length ? 'No matching AI renders' : 'Create your first AI-image video' }}</h3>
          <p>
            {{ jobs.length
              ? 'Try clearing one of the filters.'
              : 'Paste a public BandLab track above, choose a video template and visual style, then generate.' }}
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

      <section class="performance-section">
        <div class="performance-header">
          <div>
            <div class="section-kicker">AI-image performance</div>
            <h2>How fast is this workflow?</h2>
            <p>Calculated only from the latest AI-image video jobs.</p>
          </div>
        </div>

        <div class="metric-grid">
          <v-card class="metric-card metric-card--primary" rounded="xl" elevation="0">
            <span>Average end to end</span>
            <strong>{{ formatDuration(totalTimings.average) }}</strong>
            <small>triggered → finished</small>
          </v-card>
          <v-card class="metric-card" rounded="xl" elevation="0">
            <span>P95</span>
            <strong>{{ formatDuration(totalTimings.p95) }}</strong>
            <small>95% finish within this time</small>
          </v-card>
        </div>

        <v-card class="performance-table" rounded="xl" elevation="0">
          <div class="performance-table__header">
            <div>
              <span>Template comparison</span>
              <h3>Performance by motion template</h3>
            </div>
            <span>{{ jobs.length }} AI videos</span>
          </div>
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Template</th>
                  <th>Videos</th>
                  <th>Average</th>
                  <th>P95</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="summary in templateSummaries" :key="summary.id">
                  <td>{{ summary.name }}</td>
                  <td>{{ summary.videos }}</td>
                  <td>{{ formatDuration(summary.average) }}</td>
                  <td>{{ formatDuration(summary.p95) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </v-card>
      </section>
    </v-container>

    <v-snackbar v-model="showSuccess" color="success" :timeout="4500">
      <v-icon icon="mdi-check-circle" class="mr-2" />
      AI-image job created. This page will refresh while it renders.
    </v-snackbar>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AiImageJobCard from '@/components/AiImageJobCard.vue'
import AiVideoTemplatePicker from '@/components/AiVideoTemplatePicker.vue'
import AiVisualStylePicker from '@/components/AiVisualStylePicker.vue'
import { useAiImageVideoJobs } from '@/composables/useAiImageVideoJobs'
import type { TrackVideoJobStatus } from '@/types/trackVideo'
import { formatDuration, formatRelativeDate } from '@/utils/formatters'
import { summarizeTimings } from '@/utils/insights'

const {
  jobs,
  visualStyles,
  videoTemplates,
  jobsLoading,
  cataloguesLoading,
  refreshing,
  submitting,
  error,
  lastUpdatedAt,
  loadCatalogues,
  loadJobs,
  refreshJobs,
  submitJob,
  clearError,
  stopPolling,
} = useAiImageVideoJobs()

const trackUrl = ref('')
const selectedTemplate = ref<string | null>(null)
const selectedVisualStyle = ref<string | null>(null)
const urlTouched = ref(false)
const showSuccess = ref(false)
const search = ref('')
const statusFilter = ref<'all' | TrackVideoJobStatus>('all')
const templateFilter = ref('all')
const styleFilter = ref('all')

const statusOptions = [
  { title: 'All statuses', value: 'all' },
  { title: 'Queued', value: 'queued' },
  { title: 'Rendering', value: 'processing' },
  { title: 'Ready', value: 'completed' },
  { title: 'Failed', value: 'failed' },
]

const templateIds = computed(() => [
  ...new Set([
    ...videoTemplates.value.map(template => template.id),
    ...jobs.value.map(job => job.template),
  ]),
])

const visualStyleIds = computed(() => [
  ...new Set([
    ...visualStyles.value.map(style => style.id),
    ...jobs.value.map(job => job.visualStyle),
  ]),
])

const templateFilterOptions = computed(() => [
  { title: 'All templates', value: 'all' },
  ...templateIds.value.map(id => ({ title: templateName(id), value: id })),
])

const styleFilterOptions = computed(() => [
  { title: 'All visual styles', value: 'all' },
  ...visualStyleIds.value.map(id => ({ title: visualStyleName(id), value: id })),
])

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
const completedJobs = computed(() => jobs.value.filter(job => job.status === 'completed'))
const totalTimings = computed(() => summarizeTimings(
  completedJobs.value.map(job => job.totalDurationMs),
))
const hasFilters = computed(() => (
  search.value.trim().length > 0
  || statusFilter.value !== 'all'
  || templateFilter.value !== 'all'
  || styleFilter.value !== 'all'
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
    if (styleFilter.value !== 'all' && job.visualStyle !== styleFilter.value) {
      return false
    }
    if (!query) {
      return true
    }

    return [
      job.track?.name,
      job.jobId,
      job.postId,
      job.assignedGenre,
      templateName(job.template),
      visualStyleName(job.visualStyle),
    ].some(value => value?.toLowerCase().includes(query))
  })
})

const templateSummaries = computed(() => templateIds.value.map(id => {
  const matching = jobs.value.filter(job => job.template === id)
  const completed = matching.filter(job => job.status === 'completed')
  const timings = summarizeTimings(completed.map(job => job.totalDurationMs))

  return {
    id,
    name: templateName(id),
    videos: matching.length,
    average: timings.average,
    p95: timings.p95,
  }
}))

function templateName(id: string): string {
  return videoTemplates.value.find(template => template.id === id)?.name || id
}

function visualStyleName(id: string): string {
  return visualStyles.value.find(style => style.id === id)?.name || id
}

async function handleSubmit(): Promise<void> {
  urlTouched.value = true
  if (
    rawTrackUrlError.value
    || !selectedTemplate.value
    || !selectedVisualStyle.value
  ) {
    return
  }

  clearError()
  const created = await submitJob(
    trackUrl.value.trim(),
    selectedTemplate.value,
    selectedVisualStyle.value,
  )
  if (created) {
    showSuccess.value = true
    trackUrl.value = ''
    urlTouched.value = false
  }
}

async function refreshAll(): Promise<void> {
  await Promise.all([loadCatalogues(), refreshJobs()])
}

function clearFilters(): void {
  search.value = ''
  statusFilter.value = 'all'
  templateFilter.value = 'all'
  styleFilter.value = 'all'
}

onMounted(() => {
  void Promise.all([loadCatalogues(), loadJobs()])
})

onBeforeUnmount(stopPolling)
</script>

<style scoped>
.ai-page {
  min-height: calc(100vh - 68px);
}

.section-kicker {
  color: #ff7667;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.13em;
}

.content-container {
  padding-top: 38px;
  padding-bottom: 80px;
}

.generator-card {
  position: relative;
  z-index: 2;
  padding: 28px;
  background:
    linear-gradient(135deg, rgba(255, 92, 74, 0.075), transparent 34%),
    rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.2) !important;
}

.generator-header,
.library-header,
.performance-header {
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 25px;
}

.generator-header h2,
.library-header h2,
.performance-header h2 {
  margin: 0;
  font-size: clamp(1.6rem, 3vw, 2.25rem);
  line-height: 1.1;
  letter-spacing: -0.045em;
}

.library-header p,
.performance-header p {
  margin: 7px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.48);
  font-size: 0.78rem;
}

.track-start-form {
  display: flex;
  flex-direction: column;
}

.track-url-field > p {
  margin: -10px 0 0 16px;
  color: rgba(var(--v-theme-on-surface), 0.52);
  font-size: 0.72rem;
  line-height: 1.5;
}

.field-heading {
  display: flex;
  gap: 14px;
  align-items: flex-end;
  justify-content: space-between;
  margin: 26px 0 11px;
}

.field-heading > div {
  display: flex;
  flex-direction: column;
}

.field-heading span {
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.field-heading small {
  margin-top: 3px;
  color: rgba(var(--v-theme-on-surface), 0.4);
  font-size: 0.69rem;
}

.field-heading--visual {
  margin-top: 36px;
}

.template-loading {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.style-loading > div:last-child {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.generator-footer {
  display: flex;
  gap: 24px;
  align-items: center;
  justify-content: space-between;
  margin-top: 24px;
}

.generator-footer p {
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.52);
  font-size: 0.76rem;
}

.library-section,
.performance-section {
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
  grid-template-columns: minmax(240px, 1fr) 160px 180px 210px;
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
  align-items: center;
  flex-direction: column;
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
  color: #ff7667;
  background: rgba(255, 118, 103, 0.1);
  border-radius: 24px;
}

.empty-state h3 {
  margin: 0;
  font-size: 1.15rem;
}

.empty-state p {
  max-width: 520px;
  margin: 8px 0 18px;
  color: rgba(var(--v-theme-on-surface), 0.52);
  font-size: 0.87rem;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.metric-card,
.performance-table {
  background: rgba(var(--v-theme-surface), 0.78);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.09);
}

.metric-card {
  display: flex;
  min-height: 150px;
  padding: 22px;
  flex-direction: column;
}

.metric-card--primary {
  color: #f7f8f4;
  background:
    radial-gradient(circle at 100% 0, rgba(255, 92, 74, 0.24), transparent 44%),
    #16181d;
  border-color: rgba(255, 118, 103, 0.22);
}

.metric-card span,
.metric-card small {
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.72rem;
}

.metric-card strong {
  margin-top: auto;
  font-size: clamp(1.75rem, 3vw, 2.6rem);
  line-height: 1;
}

.metric-card small {
  margin-top: 8px;
}

.performance-table {
  padding: 24px;
  margin-top: 14px;
}

.performance-table__header {
  display: flex;
  gap: 18px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 22px;
}

.performance-table__header > span,
.performance-table__header > div > span {
  color: rgba(var(--v-theme-on-surface), 0.48);
  font-size: 0.7rem;
}

.performance-table__header > div > span {
  color: #ff7667;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.performance-table h3 {
  margin: 3px 0 0;
  font-size: 1.3rem;
}

.table-scroll {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 12px 10px;
  text-align: left;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.07);
}

th {
  color: rgba(var(--v-theme-on-surface), 0.45);
  font-size: 0.66rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

td {
  font-size: 0.78rem;
}

@media (max-width: 1000px) {
  .filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filters > :first-child {
    grid-column: 1 / -1;
  }

  .jobs-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .generator-card {
    padding: 20px;
  }

  .generator-header,
  .library-header,
  .performance-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .generator-footer {
    align-items: stretch;
    flex-direction: column;
  }

  .generator-footer .v-btn {
    width: 100%;
  }

  .filters,
  .jobs-grid,
  .metric-grid {
    grid-template-columns: 1fr;
  }

  .filters > :first-child {
    grid-column: auto;
  }

  .updated-at {
    display: none;
  }
}
</style>
