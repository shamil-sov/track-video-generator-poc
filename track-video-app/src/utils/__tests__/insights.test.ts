import { describe, expect, it } from 'vitest'
import type { TrackVideoJob } from '@/types/trackVideo'
import { summarizeByTemplate } from '@/utils/insights'

function job(template: string): TrackVideoJob {
  return {
    jobId: `job-${template}`,
    trackUrl: 'https://test.bandlab.com/track/5f42bf92-e3de-ed11-8aae-501ac5ee31b6',
    postId: '5f42bf92-e3de-ed11-8aae-501ac5ee31b6',
    revisionId: null,
    template,
    status: 'completed',
    track: null,
    triggeredAt: '2026-08-26T10:00:00Z',
    processingStartedAt: '2026-08-26T10:00:01Z',
    finishedAt: '2026-08-26T10:00:10Z',
    updatedAt: '2026-08-26T10:00:10Z',
    queueDurationMs: 1000,
    processingDurationMs: 9000,
    totalDurationMs: 10000,
    videoUrl: 'video.mp4',
    thumbnailUrl: null,
    error: null,
  }
}

describe('summarizeByTemplate', () => {
  it('uses catalogue names and previews while retaining unknown historic templates', () => {
    const summaries = summarizeByTemplate(
      [job('orbit'), job('retired-style')],
      [{ id: 'orbit', name: 'Sonic Halo', exampleVideoUrls: ['orbit.mp4'] }],
    )

    expect(summaries.map(summary => ({
      template: summary.template,
      label: summary.label,
      exampleVideoUrl: summary.exampleVideoUrl,
    }))).toEqual([
      { template: 'orbit', label: 'Sonic Halo', exampleVideoUrl: 'orbit.mp4' },
      { template: 'retired-style', label: 'Retired Style', exampleVideoUrl: null },
    ])
  })
})
