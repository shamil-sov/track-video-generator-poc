import { computed, ref } from 'vue'
import {
  createAiGeneratedImageJob,
  getAiGeneratedImageJob,
  getAiGeneratedImageJobs,
} from '@/services/api'
import type { AiGeneratedImageJob } from '@/types/aiImageGeneration'
import { isActiveJob } from '@/types/trackVideo'

const POLL_INTERVAL_MS = 4000

const jobs = ref<AiGeneratedImageJob[]>([])
const jobsLoading = ref(false)
const refreshing = ref(false)
const submitting = ref(false)
const jobsError = ref<string | null>(null)
const submissionError = ref<string | null>(null)
const lastUpdatedAt = ref<Date | null>(null)
const pendingJobIds = new Set<string>()

let pollTimer: ReturnType<typeof setTimeout> | null = null
let pollingEnabled = false
let latestRequestId = 0

function errorMessage(errorValue: unknown, fallback: string): string {
  return errorValue instanceof Error ? errorValue.message : fallback
}

function clearPollTimer(): void {
  if (pollTimer !== null) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
}

function syncPolling(): void {
  const shouldPoll = jobs.value.some(job => isActiveJob(job))
  if (pollingEnabled && shouldPoll && pollTimer === null) {
    pollTimer = setTimeout(() => {
      pollTimer = null
      void pollActiveJobs()
    }, POLL_INTERVAL_MS)
  } else if (!pollingEnabled || !shouldPoll) {
    clearPollTimer()
  }
}

async function fetchJobs(showLoader = false): Promise<void> {
  clearPollTimer()
  const requestId = ++latestRequestId

  if (showLoader) {
    jobsLoading.value = true
  } else {
    refreshing.value = true
  }

  try {
    const fetchedJobs = await getAiGeneratedImageJobs()
    if (requestId !== latestRequestId) {
      return
    }

    const fetchedIds = new Set(fetchedJobs.map(job => job.jobId))
    const pendingPlaceholders = jobs.value.filter(job => (
      pendingJobIds.has(job.jobId) && !fetchedIds.has(job.jobId)
    ))

    for (const job of fetchedJobs) {
      if (!isActiveJob(job)) {
        pendingJobIds.delete(job.jobId)
      }
    }

    jobs.value = [...pendingPlaceholders, ...fetchedJobs].slice(0, 50)
    jobsError.value = null
    lastUpdatedAt.value = new Date()
  } catch (errorValue) {
    if (requestId === latestRequestId) {
      jobsError.value = errorMessage(errorValue, 'Could not load generated images.')
    }
  } finally {
    if (requestId === latestRequestId) {
      jobsLoading.value = false
      refreshing.value = false
      syncPolling()
    }
  }
}

async function pollActiveJobs(): Promise<void> {
  if (!pollingEnabled) {
    return
  }

  const activeJobs = jobs.value.filter(job => isActiveJob(job))
  if (!activeJobs.length) {
    syncPolling()
    return
  }

  const requestId = ++latestRequestId
  const results = await Promise.allSettled(
    activeJobs.map(job => getAiGeneratedImageJob(job.jobId)),
  )
  if (requestId !== latestRequestId || !pollingEnabled) {
    return
  }

  const updates = new Map<string, AiGeneratedImageJob>()
  let failedRefreshes = 0
  results.forEach(result => {
    if (result.status === 'fulfilled') {
      updates.set(result.value.jobId, result.value)
      if (!isActiveJob(result.value)) {
        pendingJobIds.delete(result.value.jobId)
      }
    } else {
      failedRefreshes += 1
    }
  })

  jobs.value = jobs.value.map(job => updates.get(job.jobId) || job)
  jobsError.value = failedRefreshes
    ? 'Some image jobs could not be refreshed. Retrying automatically.'
    : null
  lastUpdatedAt.value = new Date()
  syncPolling()
}

async function submitJob(prompt: string, trackUrl?: string): Promise<boolean> {
  pollingEnabled = true
  submitting.value = true
  submissionError.value = null

  const normalizedPrompt = prompt.trim()
  const normalizedTrackUrl = trackUrl?.trim() || null

  try {
    const createdJob = await createAiGeneratedImageJob(
      normalizedPrompt,
      normalizedTrackUrl || undefined,
    )
    pendingJobIds.add(createdJob.jobId)
    jobs.value = [
      {
        jobId: createdJob.jobId,
        promptTemplate: normalizedPrompt,
        resolvedPrompt: null,
        trackUrl: normalizedTrackUrl,
        postId: null,
        revisionId: null,
        track: null,
        status: createdJob.status,
        triggeredAt: createdJob.triggeredAt,
        processingStartedAt: null,
        finishedAt: null,
        updatedAt: createdJob.triggeredAt,
        queueDurationMs: null,
        processingDurationMs: null,
        totalDurationMs: null,
        imageUrl: null,
        error: null,
      },
      ...jobs.value.filter(job => job.jobId !== createdJob.jobId),
    ].slice(0, 50)
    syncPolling()
    return true
  } catch (errorValue) {
    submissionError.value = errorMessage(errorValue, 'Could not create the image job.')
    return false
  } finally {
    submitting.value = false
  }
}

function stopPolling(): void {
  pollingEnabled = false
  latestRequestId += 1
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
  jobsError.value = null
  submissionError.value = null
}

export function useAiGeneratedImages() {
  return {
    jobs,
    activeJobCount: computed(() => jobs.value.filter(job => isActiveJob(job)).length),
    jobsLoading,
    refreshing,
    submitting,
    error: computed(() => submissionError.value || jobsError.value),
    lastUpdatedAt,
    loadJobs,
    refreshJobs,
    submitJob,
    clearError,
    stopPolling,
  }
}
