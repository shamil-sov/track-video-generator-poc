import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createAiImageVideoJob,
  getAiImageVideoJobs,
  getAiImageVideoTemplates,
  getAiImageVisualStyles,
} from '@/services/api'
import { useAiImageVideoJobs } from '@/composables/useAiImageVideoJobs'
import type { AiImageVideoJob } from '@/types/aiImageTrackVideo'

vi.mock('@/services/api', () => ({
  createAiImageVideoJob: vi.fn(),
  getAiImageVideoJobs: vi.fn(),
  getAiImageVideoTemplates: vi.fn(),
  getAiImageVisualStyles: vi.fn(),
}))

const createJobMock = vi.mocked(createAiImageVideoJob)
const getJobsMock = vi.mocked(getAiImageVideoJobs)
const getTemplatesMock = vi.mocked(getAiImageVideoTemplates)
const getStylesMock = vi.mocked(getAiImageVisualStyles)

function job(jobId: string, status: AiImageVideoJob['status']): AiImageVideoJob {
  return {
    jobId,
    trackUrl: 'https://test.bandlab.com/track/5f42bf92-e3de-ed11-8aae-501ac5ee31b6',
    postId: '5f42bf92-e3de-ed11-8aae-501ac5ee31b6',
    revisionId: null,
    template: 'orbit',
    visualStyle: 'living-impasto',
    assignedGenre: status === 'completed' ? 'Blues' : null,
    status,
    track: null,
    triggeredAt: '2026-08-23T10:00:00Z',
    processingStartedAt: status === 'queued' ? null : '2026-08-23T10:00:01Z',
    finishedAt: status === 'completed' ? '2026-08-23T10:00:30Z' : null,
    updatedAt: '2026-08-23T10:00:30Z',
    queueDurationMs: status === 'queued' ? null : 1000,
    processingDurationMs: status === 'completed' ? 29000 : null,
    totalDurationMs: status === 'completed' ? 30000 : null,
    videoUrl: status === 'completed' ? 'https://cdn.example/video.mp4' : null,
    thumbnailUrl: status === 'completed' ? 'https://cdn.example/thumbnail.jpg' : null,
    error: null,
  }
}

describe('useAiImageVideoJobs', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()

    const state = useAiImageVideoJobs()
    state.stopPolling()
    state.jobs.value = []
    state.visualStyles.value = []
    state.videoTemplates.value = []
    state.clearError()
  })

  it('keeps a submitted job visible and polls until the returned job ID is terminal', async () => {
    createJobMock.mockResolvedValue({
      jobId: 'new-job',
      status: 'queued',
      triggeredAt: '2026-08-23T10:00:00Z',
    })
    getJobsMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([job('new-job', 'completed')])

    const state = useAiImageVideoJobs()
    await expect(state.submitJob(
      'https://test.bandlab.com/track/5f42bf92-e3de-ed11-8aae-501ac5ee31b6',
      'orbit',
      'living-impasto',
    )).resolves.toBe(true)

    expect(state.jobs.value).toEqual([
      expect.objectContaining({ jobId: 'new-job', status: 'queued' }),
    ])

    await vi.advanceTimersByTimeAsync(5000)

    expect(getJobsMock).toHaveBeenCalledTimes(2)
    expect(state.jobs.value).toEqual([
      expect.objectContaining({ jobId: 'new-job', status: 'completed' }),
    ])
    state.stopPolling()
  })

  it('ignores an older list response that finishes after a newer refresh', async () => {
    let resolveOlder!: (jobs: AiImageVideoJob[]) => void
    let resolveNewer!: (jobs: AiImageVideoJob[]) => void
    getJobsMock
      .mockImplementationOnce(() => new Promise(resolve => {
        resolveOlder = resolve
      }))
      .mockImplementationOnce(() => new Promise(resolve => {
        resolveNewer = resolve
      }))

    const state = useAiImageVideoJobs()
    const olderRequest = state.loadJobs()
    const newerRequest = state.refreshJobs()

    resolveNewer([job('existing-job', 'completed')])
    await newerRequest
    resolveOlder([job('existing-job', 'processing')])
    await olderRequest

    expect(state.jobs.value[0]?.status).toBe('completed')
    state.stopPolling()
  })

  it('preserves a catalogue that loaded when the other catalogue fails', async () => {
    getStylesMock.mockResolvedValue([{
      id: 'living-impasto',
      name: 'Living Impasto',
      exampleImageUrls: ['https://cdn.example/one.jpg'],
    }])
    getTemplatesMock.mockRejectedValue(new Error('Templates unavailable'))

    const state = useAiImageVideoJobs()
    await state.loadCatalogues()

    expect(state.visualStyles.value).toHaveLength(1)
    expect(state.videoTemplates.value).toHaveLength(0)
    expect(state.error.value).toContain('Templates unavailable')
  })

  it('does not restart polling after the page stops it', async () => {
    createJobMock.mockResolvedValue({
      jobId: 'stopped-job',
      status: 'queued',
      triggeredAt: '2026-08-23T10:00:00Z',
    })
    getJobsMock.mockResolvedValue([])

    const state = useAiImageVideoJobs()
    await state.submitJob(
      'https://test.bandlab.com/track/5f42bf92-e3de-ed11-8aae-501ac5ee31b6',
      'orbit',
      'living-impasto',
    )
    state.stopPolling()

    await vi.advanceTimersByTimeAsync(10000)

    expect(getJobsMock).toHaveBeenCalledTimes(1)
  })
})
