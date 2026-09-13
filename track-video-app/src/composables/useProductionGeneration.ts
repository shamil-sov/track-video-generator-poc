import { computed, onBeforeUnmount, ref } from 'vue'
import { getProductionGeneration, startProductionGeneration } from '@/services/productionTrackVideo'
import type { TrackVideoGeneration, TrackVideoGenerationRequest } from '@/types/productionTrackVideo'

export function useProductionGeneration() {
  const job = ref<TrackVideoGeneration | null>(null)
  const submitting = ref(false)
  const error = ref<string | null>(null)
  const pollingError = ref<string | null>(null)
  const polling = ref(false)
  const active = computed(() => submitting.value || job.value?.status === 'queued' || job.value?.status === 'processing')
  let sequence = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  let controller: AbortController | null = null
  let baseUrl = ''
  let token = ''
  let failedChecks = 0

  function reset(): void {
    sequence += 1
    if (timer !== null) clearTimeout(timer)
    timer = null
    controller?.abort()
    controller = null
    job.value = null
    submitting.value = false
    error.value = null
    pollingError.value = null
    polling.value = false
    failedChecks = 0
    baseUrl = ''
    token = ''
  }

  function scheduleCheck(requestSequence: number): void {
    polling.value = true
    timer = setTimeout(() => {
      timer = null
      void checkStatus(requestSequence)
    }, 2500)
  }

  async function checkStatus(requestSequence: number): Promise<void> {
    if (!job.value || requestSequence !== sequence) return
    controller = new AbortController()
    polling.value = true
    try {
      const updated = await getProductionGeneration(baseUrl, job.value.jobId, token, controller.signal)
      if (requestSequence !== sequence) return
      job.value = updated
      pollingError.value = null
      failedChecks = 0
      if (updated.status === 'queued' || updated.status === 'processing') {
        scheduleCheck(requestSequence)
      } else {
        polling.value = false
      }
    } catch (cause) {
      if (requestSequence !== sequence) return
      failedChecks += 1
      pollingError.value = cause instanceof Error ? cause.message : 'Could not check the video status.'
      if (failedChecks < 3) {
        scheduleCheck(requestSequence)
      } else {
        polling.value = false
      }
    }
  }

  function retryStatus(): void {
    if (!active.value || polling.value || submitting.value) return
    failedChecks = 0
    pollingError.value = null
    void checkStatus(sequence)
  }

  async function generate(apiBaseUrl: string, request: TrackVideoGenerationRequest, bearerToken: string): Promise<void> {
    if (active.value) return
    reset()
    const requestSequence = sequence
    baseUrl = apiBaseUrl
    token = bearerToken
    controller = new AbortController()
    submitting.value = true
    try {
      const created = await startProductionGeneration(baseUrl, request, token, controller.signal)
      if (requestSequence !== sequence) return
      job.value = created
      if (created.status === 'queued' || created.status === 'processing') scheduleCheck(requestSequence)
    } catch (cause) {
      if (requestSequence !== sequence) return
      error.value = cause instanceof Error ? cause.message : 'Could not start video generation.'
    } finally {
      if (requestSequence === sequence) submitting.value = false
    }
  }

  onBeforeUnmount(reset)
  return { job, active, submitting, error, pollingError, polling, generate, retryStatus, reset }
}
