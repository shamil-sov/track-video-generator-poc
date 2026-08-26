<template>
  <main class="insights-page">
    <v-container class="page-container py-10 py-md-14">
      <CoverSectionNav />

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

      <v-alert
        v-if="templateError"
        type="warning"
        variant="tonal"
        closable
        class="mb-6"
        @click:close="clearTemplateError"
      >
        {{ templateError }} Template IDs are shown as fallback labels.
      </v-alert>

      <template v-if="loading">
        <div class="metric-grid">
          <v-skeleton-loader v-for="index in 2" :key="index" type="article" />
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
            <span class="metric-label">P95</span>
            <strong>{{ formatDuration(totalTimings.p95) }}</strong>
            <span class="metric-note">95% finish within this time</span>
          </v-card>
        </div>

        <v-card class="template-card" rounded="xl" elevation="0">
          <div class="card-header template-card__header">
            <div>
              <div class="card-kicker">Style comparison</div>
              <h2>Performance by template</h2>
            </div>
            <span>{{ jobs.length }} total videos</span>
          </div>

          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Style</th>
                  <th>Videos</th>
                  <th>Avg total</th>
                  <th>P95</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="summary in templateSummaries" :key="summary.template">
                  <td>
                    <div class="template-name">
                      <video
                        v-if="summary.exampleVideoUrl"
                        :src="summary.exampleVideoUrl"
                        :aria-label="`${summary.label} video example`"
                        class="template-performance-preview"
                        autoplay
                        loop
                        muted
                        playsinline
                        preload="metadata"
                      ></video>
                      <div v-else class="template-performance-preview template-performance-preview--empty">
                        <v-icon icon="mdi-video-outline" size="20" />
                      </div>
                      <span>{{ summary.label }}</span>
                    </div>
                  </td>
                  <td>{{ summary.total }}</td>
                  <td>{{ formatDuration(summary.averageTotalMs) }}</td>
                  <td>{{ formatDuration(summary.p95TotalMs) }}</td>
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
                  {{ templateName(job.template) }} ·
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
import CoverSectionNav from '@/components/CoverSectionNav.vue'
import { useTrackVideoJobs } from '@/composables/useTrackVideoJobs'
import { useVideoTemplates } from '@/composables/useVideoTemplates'
import { formatDuration, formatRelativeDate } from '@/utils/formatters'
import { summarizeByTemplate, summarizeTimings } from '@/utils/insights'

const {
  jobs,
  loading,
  refreshing,
  error,
  lastUpdatedAt,
  loadJobs,
  refreshJobs,
  stopPolling,
} = useTrackVideoJobs()

const {
  templates: videoTemplates,
  error: templateError,
  loadTemplates,
  templateName,
  clearError: clearTemplateError,
} = useVideoTemplates()

const completedJobs = computed(() => jobs.value.filter(job => job.status === 'completed'))

const totalTimings = computed(() => summarizeTimings(
  completedJobs.value.map(job => job.totalDurationMs),
))
const templateSummaries = computed(() => summarizeByTemplate(jobs.value, videoTemplates.value))
const recentCompleted = computed(() => completedJobs.value.slice(0, 50))
const recentMaximum = computed(() => Math.max(
  ...recentCompleted.value.map(job => job.totalDurationMs || 0),
  1,
))

function recentBarWidth(value: number | null): number {
  if (value === null) {
    return 0
  }
  return Math.max(4, (value / recentMaximum.value) * 100)
}

onMounted(() => {
  void Promise.all([loadTemplates(), loadJobs()])
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
  grid-template-columns: repeat(2, minmax(0, 1fr));
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

.template-performance-preview--empty {
  display: grid;
  place-items: center;
  color: rgba(var(--v-theme-on-surface), 0.34);
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
