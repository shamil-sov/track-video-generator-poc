import { computed, ref } from 'vue'
import {
  createAiImageVideoJob,
  getAiImageVideoJobs,
  getAiImageVideoTemplates,
  getAiImageVisualStyles,
} from '@/services/api'
import type {
  AiImageVideoJob,
  AiImageVideoTemplate,
  AiImageVisualStyle,
} from '@/types/aiImageTrackVideo'
import { isActiveJob } from '@/types/trackVideo'

const POLL_INTERVAL_MS = 5000

const jobs = ref<AiImageVideoJob[]>([])
const visualStyles = ref<AiImageVisualStyle[]>([])
const videoTemplates = ref<AiImageVideoTemplate[]>([])
const jobsLoading = ref(false)
const cataloguesLoading = ref(false)
const refreshing = ref(false)
const submitting = ref(false)
const catalogueError = ref<string | null>(null)
const jobsError = ref<string | null>(null)
const submissionError = ref<string | null>(null)
const lastUpdatedAt = ref<Date | null>(null)
const pendingJobIds = new Set<string>()

let pollTimer: ReturnType<typeof setTimeout> | null = null
let pollingEnabled = false
let latestJobsRequestId = 0

function errorMessage(errorValue: unknown, fallback: string): string {
  return errorValue instanceof Error ? errorValue.message : fallback
}

async function loadCatalogues(): Promise<void> {
  if (visualStyles.value.length && videoTemplates.value.length) {
    return
  }
  if (cataloguesLoading.value) {
    return
  }

  cataloguesLoading.value = true
  try {
    const [stylesResult, templatesResult] = await Promise.allSettled([
      getAiImageVisualStyles(),
      getAiImageVideoTemplates(),
    ])

    const failures: string[] = []
    if (stylesResult.status === 'fulfilled') {
      visualStyles.value = stylesResult.value
    } else {
      failures.push(errorMessage(stylesResult.reason, 'Could not load AI visual styles.'))
    }
    if (templatesResult.status === 'fulfilled') {
      videoTemplates.value = templatesResult.value
    } else {
      failures.push(errorMessage(templatesResult.reason, 'Could not load AI video templates.'))
    }
    catalogueError.value = failures.length ? failures.join(' ') : null
  } finally {
    cataloguesLoading.value = false
  }
}

async function fetchJobs(showLoader = false): Promise<void> {
  clearPollTimer()
  const requestId = ++latestJobsRequestId

  if (showLoader) {
    jobsLoading.value = true
  } else {
    refreshing.value = true
  }

  try {
    const fetchedJobs = await getAiImageVideoJobs()
    if (requestId !== latestJobsRequestId) {
      return
    }

    const fetchedJobIds = new Set(fetchedJobs.map(job => job.jobId))
    const pendingPlaceholders = jobs.value.filter(job => (
      pendingJobIds.has(job.jobId) && !fetchedJobIds.has(job.jobId)
    ))

    for (const job of fetchedJobs) {
      if (job.status === 'completed' || job.status === 'failed') {
        pendingJobIds.delete(job.jobId)
      }
    }

    jobs.value = [...pendingPlaceholders, ...fetchedJobs].slice(0, 50)
    lastUpdatedAt.value = new Date()
    jobsError.value = null
  } catch (errorValue) {
    if (requestId === latestJobsRequestId) {
      jobsError.value = errorMessage(errorValue, 'Could not load AI-image video jobs.')
    }
  } finally {
    if (requestId === latestJobsRequestId) {
      jobsLoading.value = false
      refreshing.value = false
      syncPolling()
    }
  }
}

async function submitJob(
  trackUrl: string,
  template: string,
  visualStyle: string,
): Promise<boolean> {
  pollingEnabled = true
  submitting.value = true
  submissionError.value = null

  try {
    const createdJob = await createAiImageVideoJob(trackUrl, template, visualStyle)
    pendingJobIds.add(createdJob.jobId)
    jobs.value = [
      {
        jobId: createdJob.jobId,
        trackUrl,
        postId: null,
        revisionId: null,
        template,
        visualStyle,
        assignedGenre: null,
        status: createdJob.status,
        track: null,
        triggeredAt: createdJob.triggeredAt,
        processingStartedAt: null,
        finishedAt: null,
        updatedAt: createdJob.triggeredAt,
        queueDurationMs: null,
        processingDurationMs: null,
        totalDurationMs: null,
        videoUrl: null,
        thumbnailUrl: null,
        error: null,
      },
      ...jobs.value.filter(job => job.jobId !== createdJob.jobId),
    ].slice(0, 50)

    await fetchJobs()
    return true
  } catch (errorValue) {
    submissionError.value = errorMessage(errorValue, 'Could not create the AI-image video job.')
    return false
  } finally {
    submitting.value = false
  }
}

function syncPolling(): void {
  const shouldPoll = pendingJobIds.size > 0 || jobs.value.some(job => isActiveJob(job))

  if (pollingEnabled && shouldPoll && pollTimer === null) {
    pollTimer = setTimeout(() => {
      pollTimer = null
      void fetchJobs()
    }, POLL_INTERVAL_MS)
  } else if (!shouldPoll || !pollingEnabled) {
    clearPollTimer()
  }
}

function clearPollTimer(): void {
  if (pollTimer !== null) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
}

function stopPolling(): void {
  pollingEnabled = false
  latestJobsRequestId += 1
  jobsLoading.value = false
  refreshing.value = false
  clearPollTimer()
}

function loadJobs(): Promise<void> {
  pollingEnabled = true
  return fetchJobs(jobs.value.length === 0)
}

function refreshJobs(): Promise<void> {
  pollingEnabled = true
  return fetchJobs()
}

function clearError(): void {
  catalogueError.value = null
  jobsError.value = null
  submissionError.value = null
}

export function useAiImageVideoJobs() {
  return {
    jobs,
    visualStyles,
    videoTemplates,
    activeJobCount: computed(() => jobs.value.filter(job => isActiveJob(job)).length),
    jobsLoading,
    cataloguesLoading,
    refreshing,
    submitting,
    error: computed(() => (
      submissionError.value || catalogueError.value || jobsError.value
    )),
    lastUpdatedAt,
    loadCatalogues,
    loadJobs,
    refreshJobs,
    submitJob,
    clearError,
    stopPolling,
  }
}
