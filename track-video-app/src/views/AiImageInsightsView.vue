<template>
  <main class="ai-insights-page">
    <v-container class="page-container content-container">
      <AiVideoSectionNav />

      <section class="performance-section">
        <div class="performance-header">
          <div>
            <div class="section-kicker">AI-image performance</div>
            <h1>How fast is this workflow?</h1>
            <p>Calculated only from the latest 50 AI-image video jobs.</p>
          </div>
          <div class="performance-actions">
            <span v-if="lastUpdatedAt" class="updated-at">
              Updated {{ formatRelativeDate(lastUpdatedAt.toISOString()) }}
            </span>
            <v-btn
              variant="tonal"
              prepend-icon="mdi-refresh"
              aria-label="Refresh AI-video insights"
              :loading="refreshing"
              @click="refreshAll"
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
          @click:close="clearError"
        >
          {{ error }}
        </v-alert>

        <div v-if="jobsLoading" class="metric-grid">
          <v-skeleton-loader v-for="index in 2" :key="index" type="article" />
        </div>
        <template v-else>
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
          <p v-if="!jobs.length" class="no-data">No AI-video jobs yet. Generate a video to see its performance here.</p>
        </template>
      </section>
    </v-container>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import AiVideoSectionNav from '@/components/AiVideoSectionNav.vue'
import { useAiImageVideoJobs } from '@/composables/useAiImageVideoJobs'
import { formatDuration, formatRelativeDate } from '@/utils/formatters'
import { summarizeTimings } from '@/utils/insights'

const {
  jobs,
  videoTemplates,
  jobsLoading,
  refreshing,
  error,
  lastUpdatedAt,
  loadCatalogues,
  loadJobs,
  refreshJobs,
  clearError,
  stopPolling,
} = useAiImageVideoJobs()

const templateIds = computed(() => [
  ...new Set([
    ...videoTemplates.value.map(template => template.id),
    ...jobs.value.map(job => job.template),
  ]),
])

const completedJobs = computed(() => jobs.value.filter(job => job.status === 'completed'))
const totalTimings = computed(() => summarizeTimings(
  completedJobs.value.map(job => job.totalDurationMs),
))
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

async function refreshAll(): Promise<void> {
  await Promise.all([loadCatalogues(), refreshJobs()])
}

onMounted(() => {
  void Promise.all([loadCatalogues(), loadJobs()])
})

onBeforeUnmount(stopPolling)
</script>

<style scoped>
.ai-insights-page {
  min-height: calc(100vh - 68px);
}

.content-container {
  padding-top: 38px;
  padding-bottom: 80px;
}

.section-kicker {
  color: #ff7667;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.13em;
}

.performance-header {
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 25px;
}

.performance-header h1 {
  margin: 0;
  font-size: clamp(1.6rem, 3vw, 2.25rem);
  line-height: 1.1;
  letter-spacing: -0.045em;
}

.performance-header p {
  margin: 7px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.48);
  font-size: 0.78rem;
}

.performance-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.updated-at {
  color: rgba(var(--v-theme-on-surface), 0.48);
  font-size: 0.72rem;
}

.no-data {
  margin-top: 24px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  text-align: center;
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

@media (max-width: 620px) {
  .performance-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .metric-grid {
    grid-template-columns: 1fr;
  }

  .updated-at {
    display: none;
  }
}
</style>
