export const TRACK_VIDEO_TEMPLATES = [
  { id: 'audio-ring', name: 'Audio Ring' },
  { id: 'sound-wave', name: 'Sound Wave' },
  { id: 'record-player', name: 'Record Player' },
  { id: 'vinyl-sleeve', name: 'Vinyl Sleeve' },
  { id: 'music-notes', name: 'Music Notes' },
] as const

export type ProductionTemplateId = typeof TRACK_VIDEO_TEMPLATES[number]['id']

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
