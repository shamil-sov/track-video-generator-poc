import { computed, ref } from 'vue'
import { createJob, getAllJobs } from '@/services/api'
import type { TrackVideoJob, TrackVideoTemplate } from '@/types/trackVideo'
import { isActiveJob } from '@/types/trackVideo'

const POLL_INTERVAL_MS = 5000

const jobs = ref<TrackVideoJob[]>([])
const loading = ref(false)
const refreshing = ref(false)
const submitting = ref(false)
const error = ref<string | null>(null)
const lastUpdatedAt = ref<Date | null>(null)

let pollTimer: ReturnType<typeof setInterval> | null = null

function errorMessage(errorValue: unknown, fallback: string): string {
  return errorValue instanceof Error ? errorValue.message : fallback
}

async function fetchJobs(showLoader = false): Promise<void> {
  if (showLoader) {
    loading.value = true
  } else {
    refreshing.value = true
  }

  try {
    jobs.value = await getAllJobs()
    lastUpdatedAt.value = new Date()
    error.value = null
    syncPolling()
  } catch (errorValue) {
    error.value = errorMessage(errorValue, 'Could not load video jobs.')
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

async function submitJob(
  trackUrl: string,
  template: TrackVideoTemplate,
): Promise<boolean> {
  submitting.value = true
  error.value = null

  try {
    await createJob(trackUrl, template)
    await fetchJobs()
    syncPolling()
    return true
  } catch (errorValue) {
    error.value = errorMessage(errorValue, 'Could not create the video job.')
    return false
  } finally {
    submitting.value = false
  }
}

function syncPolling(): void {
  const shouldPoll = jobs.value.some(isActiveJob)

  if (shouldPoll && pollTimer === null) {
    pollTimer = setInterval(() => {
      void fetchJobs()
    }, POLL_INTERVAL_MS)
  } else if (!shouldPoll) {
    stopPolling()
  }
}

function stopPolling(): void {
  if (pollTimer !== null) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

export function useTrackVideoJobs() {
  return {
    jobs,
    activeJobCount: computed(() => jobs.value.filter(isActiveJob).length),
    loading,
    refreshing,
    submitting,
    error,
    lastUpdatedAt,
    loadJobs: () => fetchJobs(jobs.value.length === 0),
    refreshJobs: () => fetchJobs(),
    submitJob,
    stopPolling,
  }
}
