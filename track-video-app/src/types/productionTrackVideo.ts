// The preview API supplies template IDs; new IDs do not require a client release.
export type ProductionTemplateId = string

export function templateName(templateId: ProductionTemplateId): string {
  return templateId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

export interface ProductionTrack {
  trackUrl: string
  postId: string
  revisionId: string
  name: string
  artistName: string
  pictureUrl: string
  audioUrl: string
  durationSeconds: number
}

export interface ProductionTrackPreview {
  templateId: ProductionTemplateId
  videoPreviewUrl: string
  picture: { url: string, isDefault: boolean }
}

export interface TrackVideoGenerationRequest {
  trackCoverUrl: string
  trackAudioUrl: string
  templateId: ProductionTemplateId
  startTimeSeconds: number
}

export type TrackVideoGeneration =
  | { jobId: string, status: 'queued' | 'processing' }
  | { jobId: string, status: 'completed', templateId: ProductionTemplateId, videoUrl: string }
  | { jobId: string, status: 'failed', error: { message: string } }

export function segmentDuration(durationSeconds: number, startTimeSeconds: number): number {
  return Math.max(0, Math.min(15, durationSeconds - startTimeSeconds))
}

export function validSegmentStart(value: number | string | null, durationSeconds: number): boolean {
  return value !== null && String(value).trim() !== ''
    && Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) < durationSeconds
}

export function segmentTime(seconds: number): string {
  const hundredths = Math.round(seconds * 100)
  return `${Math.floor(hundredths / 6000)}:${(Math.floor(hundredths / 100) % 60).toString().padStart(2, '0')}`
    + `.${(hundredths % 100).toString().padStart(2, '0')}`
}
