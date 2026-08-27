import type { TrackVideoJobError, TrackVideoJobStatus } from '@/types/trackVideo'

export interface AiImageVisualStyle {
  id: string
  name: string
  exampleImageUrls: string[]
}

export interface AiImageVideoTemplate {
  id: string
  name: string
  description: string
  exampleVideoUrl: string
  exampleVideoUrls?: string[]
  exampleVideos?: {
    videoUrl: string
    visualStyle: Pick<AiImageVisualStyle, 'id' | 'name'>
  }[]
}

export interface AiImageTrackSnapshot {
  name: string
  durationSeconds: number
  pictureUrl: string | null
}

export interface AiImageVideoJob {
  jobId: string
  trackUrl: string
  postId: string | null
  revisionId: string | null
  template: string
  visualStyle: string
  assignedGenre: string | null
  status: TrackVideoJobStatus
  track: AiImageTrackSnapshot | null
  triggeredAt: string
  processingStartedAt: string | null
  finishedAt: string | null
  updatedAt: string
  queueDurationMs: number | null
  processingDurationMs: number | null
  totalDurationMs: number | null
  videoUrl: string | null
  thumbnailUrl: string | null
  error: TrackVideoJobError | null
}

export interface AiImageCatalogue<T> {
  data: T[]
}

export interface CreateAiImageVideoJobResult {
  jobId: string
  status: 'queued'
  triggeredAt: string
}

export interface AiImageVideoJobsPage {
  data: AiImageVideoJob[]
  paging: {
    itemsCount: number
    limit: number
    cursors: {
      after: string | null
    }
  }
}
