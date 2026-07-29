<template>
  <main class="insights-page">
    <v-container class="page-container py-10 py-md-14">
      <div class="insights-header">
        <div>
          <div class="section-kicker">Performance insights</div>
          <h1>How fast are we rendering?</h1>
          <p>Live aggregates calculated from every job currently returned by the UAT API.</p>
        </div>

        <div class="insights-header__actions">
          <span v-if="lastUpdatedAt">
            Updated {{ formatRelativeDate(lastUpdatedAt.toISOString()) }}
          </span>
          <v-btn
            variant="tonal"
            prepend-icon="mdi-refresh"
            :loading="refreshing"
            @click="refreshJobs"
          >
            Refresh
          </v-btn>
        </div>
      </div>

      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        closable
        class="mb-6"
        @click:close="error = null"
      >
        {{ error }}
      </v-alert>

      <template v-if="loading">
        <div class="metric-grid">
          <v-skeleton-loader v-for="index in 4" :key="index" type="article" />
        </div>
      </template>

      <template v-else>
        <div class="metric-grid">
          <v-card class="metric-card metric-card--primary" rounded="xl" elevation="0">
            <span class="metric-label">Average end to end</span>
            <strong>{{ formatDuration(totalTimings.average) }}</strong>
            <span class="metric-note">triggered → finished</span>
          </v-card>
          <v-card class="metric-card" rounded="xl" elevation="0">
            <span class="metric-label">Median</span>
            <strong>{{ formatDuration(totalTimings.median) }}</strong>
            <span class="metric-note">50th percentile</span>
          </v-card>
          <v-card class="metric-card" rounded="xl" elevation="0">
            <span class="metric-label">P95</span>
            <strong>{{ formatDuration(totalTimings.p95) }}</strong>
            <span class="metric-note">95% finish within this time</span>
          </v-card>
          <v-card class="metric-card" rounded="xl" elevation="0">
            <span class="metric-label">Completion rate</span>
            <strong>{{ completionRate }}</strong>
            <span class="metric-note">{{ completedJobs.length }} ready · {{ failedJobs.length }} failed</span>
          </v-card>
        </div>

        <div class="insights-grid">
          <v-card class="insight-card" rounded="xl" elevation="0">
            <div class="card-header">
              <div>
                <div class="card-kicker">Time composition</div>
                <h2>Where the time goes</h2>
              </div>
              <v-icon icon="mdi-timeline-clock-outline" color="primary" />
            </div>

            <div class="composition-total">
              <span>Average total</span>
              <strong>{{ formatDuration(totalTimings.average) }}</strong>
            </div>

            <div class="composition-bar">
              <span
                class="composition-bar__queue"
                :style="{ width: `${queueShare}%` }"
              ></span>
              <span
                class="composition-bar__processing"
                :style="{ width: `${processingShare}%` }"
              ></span>
            </div>

            <div class="composition-legend">
              <div>
                <span class="legend-dot legend-dot--queue"></span>
                <div>
                  <span>Queue</span>
                  <strong>{{ formatDuration(queueTimings.average) }}</strong>
                </div>
              </div>
              <div>
                <span class="legend-dot legend-dot--processing"></span>
                <div>
                  <span>Rendering</span>
                  <strong>{{ formatDuration(processingTimings.average) }}</strong>
                </div>
              </div>
            </div>

            <div class="range-strip">
              <div>
                <span>Fastest</span>
                <strong>{{ formatDuration(totalTimings.minimum) }}</strong>
              </div>
              <div>
                <span>Slowest</span>
                <strong>{{ formatDuration(totalTimings.maximum) }}</strong>
              </div>
              <div>
                <span>Active now</span>
                <strong>{{ activeJobCount }}</strong>
              </div>
            </div>
          </v-card>

        </div>

        <v-card class="template-card" rounded="xl" elevation="0">
          <div class="card-header template-card__header">
            <div>
              <div class="card-kicker">Style comparison</div>
              <h2>Performance by template</h2>
            </div>
            <span>{{ jobs.length }} total jobs</span>
          </div>

          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Style</th>
                  <th>Jobs</th>
                  <th>Ready</th>
                  <th>Failed</th>
                  <th>Avg total</th>
                  <th>Median</th>
                  <th>P95</th>
                  <th>Avg render</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="summary in templateSummaries" :key="summary.template">
                  <td>
                    <div class="template-name">
                      <video
                        :src="templateVideos[summary.template]"
                        :aria-label="`${summary.label} video example`"
                        class="template-performance-preview"
                        autoplay
                        loop
                        muted
                        playsinline
                        preload="metadata"
                      ></video>
                      <span>{{ summary.label }}</span>
                    </div>
                  </td>
                  <td>{{ summary.total }}</td>
                  <td>{{ summary.completed }}</td>
                  <td :class="{ 'text-error': summary.failed > 0 }">{{ summary.failed }}</td>
                  <td>{{ formatDuration(summary.averageTotalMs) }}</td>
                  <td>{{ formatDuration(summary.medianTotalMs) }}</td>
                  <td>{{ formatDuration(summary.p95TotalMs) }}</td>
                  <td>{{ formatDuration(summary.averageProcessingMs) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </v-card>

        <v-card class="insight-card recent-card" rounded="xl" elevation="0">
          <div class="card-header">
            <div>
              <div class="card-kicker">Recent runs</div>
              <h2>Latest 50 completed videos</h2>
            </div>
            <div class="recent-card__summary">
              <span>{{ recentCompleted.length }} available</span>
              <v-icon icon="mdi-chart-timeline-variant-shimmer" color="primary" />
            </div>
          </div>

          <div v-if="recentCompleted.length" class="recent-list">
            <div v-for="job in recentCompleted" :key="job.jobId" class="recent-row">
              <div class="recent-row__title">
                <span class="text-truncate">{{ job.track?.name || job.postId.slice(0, 8) }}</span>
                <small>
                  {{ templateLabel(job.template) }} ·
                  {{ formatRelativeDate(job.finishedAt || job.triggeredAt) }}
                </small>
              </div>
              <div class="recent-bar">
                <span :style="{ width: `${recentBarWidth(job.totalDurationMs)}%` }"></span>
              </div>
              <strong>{{ formatDuration(job.totalDurationMs) }}</strong>
            </div>
          </div>
          <div v-else class="insight-empty">No completed runs to compare yet.</div>
        </v-card>

        <div v-if="jobs.length === 0" class="no-data">
          No job data yet. Generate a video first to populate these insights.
        </div>
      </template>
    </v-container>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import orbitVideo from '@/assets/templates/orbit-preview.mp4'
import prismVideo from '@/assets/templates/prism-spectrum-preview.mp4'
import threeDimensionalVideo from '@/assets/templates/3d-style-preview.mp4'
import { useTrackVideoJobs } from '@/composables/useTrackVideoJobs'
import { templateLabel, type TrackVideoTemplate } from '@/types/trackVideo'
import { formatDuration, formatRelativeDate } from '@/utils/formatters'
import { summarizeByTemplate, summarizeTimings } from '@/utils/insights'

const templateVideos: Record<TrackVideoTemplate, string> = {
  orbit: orbitVideo,
  'prism-spectrum': prismVideo,
  '3d-style': threeDimensionalVideo,
}

const {
  jobs,
  activeJobCount,
  loading,
  refreshing,
  error,
  lastUpdatedAt,
  loadJobs,
  refreshJobs,
  stopPolling,
} = useTrackVideoJobs()

const completedJobs = computed(() => jobs.value.filter(job => job.status === 'completed'))
const failedJobs = computed(() => jobs.value.filter(job => job.status === 'failed'))
const terminalJobs = computed(() => [...completedJobs.value, ...failedJobs.value])

const totalTimings = computed(() => summarizeTimings(
  completedJobs.value.map(job => job.totalDurationMs),
))
const queueTimings = computed(() => summarizeTimings(
  completedJobs.value.map(job => job.queueDurationMs),
))
const processingTimings = computed(() => summarizeTimings(
  completedJobs.value.map(job => job.processingDurationMs),
))
const templateSummaries = computed(() => summarizeByTemplate(jobs.value))
const recentCompleted = computed(() => completedJobs.value.slice(0, 50))
const recentMaximum = computed(() => Math.max(
  ...recentCompleted.value.map(job => job.totalDurationMs || 0),
  1,
))

const completionRate = computed(() => {
  if (terminalJobs.value.length === 0) {
    return '—'
  }

  return `${Math.round((completedJobs.value.length / terminalJobs.value.length) * 100)}%`
})

const queueShare = computed(() => {
  if (!totalTimings.value.average || !queueTimings.value.average) {
    return 0
  }
  return Math.min(100, (queueTimings.value.average / totalTimings.value.average) * 100)
})

const processingShare = computed(() => {
  if (!totalTimings.value.average || !processingTimings.value.average) {
    return 0
  }
  return Math.min(100 - queueShare.value, (processingTimings.value.average / totalTimings.value.average) * 100)
})

function recentBarWidth(value: number | null): number {
  if (value === null) {
    return 0
  }
  return Math.max(4, (value / recentMaximum.value) * 100)
}

onMounted(() => {
  void loadJobs()
})

onBeforeUnmount(stopPolling)
</script>

<style scoped>
.insights-page {
  min-height: calc(100vh - 64px);
  background:
    radial-gradient(circle at 85% 6%, rgba(127, 140, 255, 0.12), transparent 24%),
    rgb(var(--v-theme-background));
}

.insights-header {
  display: flex;
  gap: 30px;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 38px;
}

.section-kicker,
.card-kicker {
  margin-bottom: 7px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.insights-header h1 {
  max-width: 680px;
  margin: 0;
  font-size: clamp(2.5rem, 5vw, 4.8rem);
  line-height: 0.98;
  letter-spacing: -0.065em;
}

.insights-header p {
  margin: 14px 0 0;
  color: rgba(var(--v-theme-on-background), 0.56);
}

.insights-header__actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.insights-header__actions span {
  color: rgba(var(--v-theme-on-background), 0.45);
  font-size: 0.72rem;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.metric-card,
.insight-card,
.template-card {
  background: rgba(var(--v-theme-surface), 0.78);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.09);
}

.metric-card {
  display: flex;
  flex-direction: column;
  min-height: 158px;
  padding: 22px;
}

.metric-card--primary {
  background:
    radial-gradient(circle at 100% 0, rgba(215, 255, 79, 0.22), transparent 42%),
    #16181d;
  color: #f7f8f4;
  border-color: rgba(215, 255, 79, 0.2);
}

.metric-label {
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-size: 0.74rem;
}

.metric-card--primary .metric-label,
.metric-card--primary .metric-note {
  color: rgba(247, 248, 244, 0.52);
}

.metric-card strong {
  margin-top: auto;
  font-size: clamp(1.75rem, 3vw, 2.6rem);
  line-height: 1;
  letter-spacing: -0.055em;
}

.metric-note {
  margin-top: 8px;
  color: rgba(var(--v-theme-on-surface), 0.43);
  font-size: 0.68rem;
}

.insights-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin-top: 16px;
}

.insight-card,
.template-card {
  padding: 24px;
}

.card-header {
  display: flex;
  gap: 18px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 26px;
}

.card-header h2 {
  margin: 0;
  font-size: 1.35rem;
  letter-spacing: -0.04em;
}

.composition-total {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.composition-total span {
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.76rem;
}

.composition-total strong {
  font-size: 1.3rem;
}

.composition-bar {
  display: flex;
  height: 14px;
  margin: 13px 0 18px;
  overflow: hidden;
  background: rgba(var(--v-theme-on-surface), 0.07);
  border-radius: 99px;
}

.composition-bar span {
  display: block;
  min-width: 0;
}

.composition-bar__queue {
  background: #d7ff4f;
}

.composition-bar__processing {
  background: #7f8cff;
}

.composition-legend {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.composition-legend > div {
  display: flex;
  gap: 10px;
  align-items: center;
}

.composition-legend > div > div {
  display: flex;
  flex-direction: column;
}

.composition-legend span:not(.legend-dot) {
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.7rem;
}

.composition-legend strong {
  font-size: 0.86rem;
}

.legend-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.legend-dot--queue {
  background: #d7ff4f;
}

.legend-dot--processing {
  background: #7f8cff;
}

.range-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 28px;
  padding-top: 18px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.range-strip div {
  display: flex;
  flex-direction: column;
}

.range-strip span {
  color: rgba(var(--v-theme-on-surface), 0.47);
  font-size: 0.68rem;
}

.range-strip strong {
  margin-top: 3px;
  font-size: 0.9rem;
}

.recent-list {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.recent-row {
  display: grid;
  grid-template-columns: 240px minmax(120px, 1fr) 68px;
  gap: 12px;
  align-items: center;
  min-width: 0;
  width: 100%;
  padding: 11px 0;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}

.recent-row__title {
  display: flex;
  flex-direction: column;
  min-width: 0;
  font-size: 0.77rem;
}

.recent-row__title small {
  color: rgba(var(--v-theme-on-surface), 0.42);
  font-size: 0.62rem;
}

.recent-bar {
  height: 7px;
  overflow: hidden;
  background: rgba(var(--v-theme-on-surface), 0.07);
  border-radius: 99px;
}

.recent-bar span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #7f8cff, #ff5fd2);
  border-radius: inherit;
}

.recent-row strong {
  font-size: 0.72rem;
  text-align: right;
}

.recent-card {
  margin-top: 16px;
}

.recent-card__summary {
  display: flex;
  gap: 12px;
  align-items: center;
}

.recent-card__summary span {
  color: rgba(var(--v-theme-on-surface), 0.45);
  font-size: 0.72rem;
}

.insight-empty,
.no-data {
  padding: 40px 20px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  text-align: center;
}

.template-card {
  margin-top: 16px;
}

.template-card__header > span {
  color: rgba(var(--v-theme-on-surface), 0.45);
  font-size: 0.72rem;
}

.table-scroll {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  white-space: nowrap;
}

th,
td {
  padding: 14px 16px;
  text-align: left;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.07);
}

th {
  color: rgba(var(--v-theme-on-surface), 0.44);
  font-size: 0.65rem;
  font-weight: 750;
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

td {
  font-size: 0.79rem;
}

.template-name {
  display: flex;
  gap: 12px;
  align-items: center;
  min-width: 180px;
  font-weight: 700;
}

.template-performance-preview {
  display: block;
  width: 42px;
  height: 64px;
  object-fit: cover;
  object-position: center;
  background: #111217;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 8px;
  box-shadow: 0 7px 16px rgba(0, 0, 0, 0.28);
}

@media (max-width: 950px) {
  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

}

@media (max-width: 620px) {
  .insights-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .insights-header__actions span {
    display: none;
  }

  .metric-grid {
    grid-template-columns: 1fr;
  }

  .metric-card {
    min-height: 132px;
  }

  .insight-card,
  .template-card {
    padding: 18px;
  }

  .recent-row {
    grid-template-columns: 110px minmax(60px, 1fr) 52px;
  }

  .recent-card__summary span {
    display: none;
  }
}
</style>
