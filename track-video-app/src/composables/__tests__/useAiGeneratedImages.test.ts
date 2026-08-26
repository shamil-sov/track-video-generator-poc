import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createAiGeneratedImageJob,
  deleteAiGeneratedImageJob,
  getAiGeneratedImageJob,
  getAiGeneratedImageJobs,
} from '@/services/api'
import { useAiGeneratedImages } from '@/composables/useAiGeneratedImages'
import type { AiGeneratedImageJob } from '@/types/aiImageGeneration'

vi.mock('@/services/api', () => ({
  createAiGeneratedImageJob: vi.fn(),
  deleteAiGeneratedImageJob: vi.fn(),
  getAiGeneratedImageJob: vi.fn(),
  getAiGeneratedImageJobs: vi.fn(),
}))

const createJobMock = vi.mocked(createAiGeneratedImageJob)
const deleteJobMock = vi.mocked(deleteAiGeneratedImageJob)
const getJobMock = vi.mocked(getAiGeneratedImageJob)
const getJobsMock = vi.mocked(getAiGeneratedImageJobs)

function completedJob(jobId: string): AiGeneratedImageJob {
  return {
    jobId,
    promptTemplate: 'A vivid glass sculpture',
    resolvedPrompt: 'A vivid glass sculpture',
    trackUrl: null,
    postId: null,
    revisionId: null,
    track: null,
    status: 'completed',
    triggeredAt: '2026-08-26T10:00:00Z',
    processingStartedAt: '2026-08-26T10:00:01Z',
    finishedAt: '2026-08-26T10:00:19Z',
    updatedAt: '2026-08-26T10:00:19Z',
    queueDurationMs: 1000,
    processingDurationMs: 18000,
    totalDurationMs: 19000,
    imageUrl: 'https://cdn.example/image.png',
    error: null,
  }
}

describe('useAiGeneratedImages', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()

    const state = useAiGeneratedImages()
    state.stopPolling()
    state.jobs.value = []
    state.clearError()
  })

  it('keeps a submitted prompt visible and polls its job until completion', async () => {
    createJobMock.mockResolvedValue({
      jobId: 'new-image-job',
      status: 'queued',
      triggeredAt: '2026-08-26T10:00:00Z',
    })
    getJobMock.mockResolvedValue(completedJob('new-image-job'))

    const state = useAiGeneratedImages()
    await expect(state.submitJob('A vivid glass sculpture')).resolves.toBe(true)
    expect(state.jobs.value[0]).toEqual(expect.objectContaining({
      jobId: 'new-image-job',
      status: 'queued',
    }))

    await vi.advanceTimersByTimeAsync(4000)

    expect(getJobMock).toHaveBeenCalledWith('new-image-job')
    expect(state.jobs.value[0]).toEqual(expect.objectContaining({
      status: 'completed',
      imageUrl: 'https://cdn.example/image.png',
    }))
    state.stopPolling()
  })

  it('loads the separate image-only job collection', async () => {
    getJobsMock.mockResolvedValue([completedJob('existing-image-job')])

    const state = useAiGeneratedImages()
    await state.loadJobs()

    expect(state.jobs.value).toEqual([
      expect.objectContaining({ jobId: 'existing-image-job' }),
    ])
    state.stopPolling()
  })

  it('removes a deleted image from the shared gallery', async () => {
    deleteJobMock.mockResolvedValue()

    const state = useAiGeneratedImages()
    state.jobs.value = [completedJob('delete-me')]

    await expect(state.deleteJob('delete-me')).resolves.toBe(true)

    expect(deleteJobMock).toHaveBeenCalledWith('delete-me')
    expect(state.jobs.value).toEqual([])
  })
})
