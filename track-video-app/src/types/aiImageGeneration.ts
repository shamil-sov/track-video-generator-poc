import type { TrackVideoJobError, TrackVideoJobStatus } from '@/types/trackVideo'

export interface AiGeneratedImageTrackSnapshot {
  name: string
  genre: string
}

export interface AiGeneratedImageJob {
  jobId: string
  promptTemplate: string
  resolvedPrompt: string | null
  trackUrl: string | null
  postId: string | null
  revisionId: string | null
  track: AiGeneratedImageTrackSnapshot | null
  status: TrackVideoJobStatus
  triggeredAt: string
  processingStartedAt: string | null
  finishedAt: string | null
  updatedAt: string
  queueDurationMs: number | null
  processingDurationMs: number | null
  totalDurationMs: number | null
  imageUrl: string | null
  error: TrackVideoJobError | null
}

export interface CreateAiGeneratedImageJobResult {
  jobId: string
  status: 'queued'
  triggeredAt: string
}

export interface AiGeneratedImageJobsPage {
  data: AiGeneratedImageJob[]
  paging: {
    itemsCount: number
    limit: number
    cursors: {
      after: string | null
    }
  }
}
