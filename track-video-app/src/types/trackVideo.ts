export type TrackVideoTemplate = string
export type TrackVideoJobStatus = 'queued' | 'processing' | 'completed' | 'failed'

export interface VideoTemplateCatalogueItem {
  id: TrackVideoTemplate
  name: string
  exampleVideoUrls: string[]
}

export interface VideoTemplateCatalogue {
  data: VideoTemplateCatalogueItem[]
}

export interface TrackSnapshot {
  name: string
  genre: string | null
  durationSeconds: number
  pictureUrl: string | null
}

export interface TrackVideoJobError {
  code: string
  message: string
}

export interface TrackVideoJob {
  jobId: string
  trackUrl: string
  postId: string
  revisionId: string | null
  template: TrackVideoTemplate
  status: TrackVideoJobStatus
  track: TrackSnapshot | null
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

export interface CreateTrackVideoJobResult {
  jobId: string
  status: 'queued'
  triggeredAt: string
}

export interface CoverPreviewTrackMetadata {
  trackUrl: string
  name: string
  artistName: string
  artistUsername: string | null
  pictureUrl: string
  previewSupported: boolean
}

export interface CoverVideoPreview {
  previewId: string
  template: TrackVideoTemplate
  status: 'completed'
  triggeredAt: string
  processingStartedAt: string
  finishedAt: string
  imageDownloadDurationMs: number
  renderDurationMs: number
  uploadDurationMs: number
  processingDurationMs: number
  totalDurationMs: number
  videoUrl: string
}

export interface JobsPage {
  data: TrackVideoJob[]
  paging: {
    itemsCount: number
    limit: number
    cursors: {
      after: string | null
    }
  }
}

export interface ApiError {
  errorCode?: number
  message?: string
  errorData?: unknown
}

export function isActiveJob(job: { status: TrackVideoJobStatus }): boolean {
  return job.status === 'queued' || job.status === 'processing'
}

export function fallbackTemplateName(template: TrackVideoTemplate): string {
  return template
    .split('-')
    .filter(Boolean)
    .map(part => part === '3d'
      ? '3D'
      : `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}
