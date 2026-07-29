export const VIDEO_TEMPLATES = [
  {
    value: '3d-style',
    label: '3D Style',
    shortLabel: '3D Style',
    description: 'A fluid silk current with shifting direction and depth.',
    icon: 'mdi-blur',
    accent: '#7f8cff',
  },
  {
    value: 'vinyl-orbit',
    label: 'Vinyl Orbit',
    shortLabel: 'Vinyl',
    description: 'A spinning record with a radial spectrum and moving tonearm.',
    icon: 'mdi-album',
    accent: '#ffac5f',
  },
  {
    value: 'orbit',
    label: 'Orbit',
    shortLabel: 'Orbit',
    description: 'A circular spectrum that breathes around the cover.',
    icon: 'mdi-orbit',
    accent: '#d7ff4f',
  },
  {
    value: 'prism-spectrum',
    label: 'Prism Spectrum',
    shortLabel: 'Prism',
    description: 'A sharp, colorful spectrum with an editorial feel.',
    icon: 'mdi-prism',
    accent: '#ff5fd2',
  },
  {
    value: 'music-visualizer',
    label: 'Music Visualizer',
    shortLabel: 'Visualizer',
    description: 'A classic audio-reactive visualizer built around the track cover.',
    icon: 'mdi-waveform',
    accent: '#48d7ff',
  },
] as const

export type TrackVideoTemplate = typeof VIDEO_TEMPLATES[number]['value']
export type TrackVideoJobStatus = 'queued' | 'processing' | 'completed' | 'failed'

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

export function isActiveJob(job: TrackVideoJob): boolean {
  return job.status === 'queued' || job.status === 'processing'
}

export function templateLabel(template: TrackVideoTemplate): string {
  return VIDEO_TEMPLATES.find(item => item.value === template)?.label ?? template
}
