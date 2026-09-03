import type {
  ApiError,
  CoverPreviewTrackMetadata,
  CoverPreviewBatchResult,
  CoverVideoPreview,
  CoverVideoPreviewRenderOptions,
  CreateTrackVideoJobResult,
  JobsPage,
  TrackVideoJob,
  TrackVideoTemplate,
  VideoTemplateCatalogue,
  VideoTemplateCatalogueItem,
} from '@/types/trackVideo'
import type {
  AiImageCatalogue,
  AiImageVideoJob,
  AiImageVideoJobsPage,
  AiImageVideoTemplate,
  AiImageVisualStyle,
  CreateAiImageVideoJobResult,
} from '@/types/aiImageTrackVideo'
import type {
  AiGeneratedImageJob,
  AiGeneratedImageJobsPage,
  CreateAiGeneratedImageJobResult,
} from '@/types/aiImageGeneration'
import { shuffled } from '@/utils/shuffle'

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL
  || 'https://septxumlfc.execute-api.ap-southeast-1.amazonaws.com/api/v1.3'
).replace(/\/$/, '')

const JOBS_URL = `${API_BASE_URL}/track-video-generator/jobs`
const VIDEO_TEMPLATES_URL = `${API_BASE_URL}/track-video-generator/video-templates`
const VIDEO_PREVIEWS_URL = `${API_BASE_URL}/track-video-generator/video-previews`
const VIDEO_PREVIEW_BATCHES_URL = `${API_BASE_URL}/track-video-generator/video-preview-batches`
const IMAGE_PREVIEW_BATCHES_URL = `${API_BASE_URL}/track-video-generator/image-preview-batches`

const AI_IMAGE_API_URL = `${API_BASE_URL}/track-video-generator`
const AI_IMAGE_STYLES_URL = `${AI_IMAGE_API_URL}/ai-image-visual-styles`
const AI_IMAGE_EXCLUDED_STYLES_URL = `${AI_IMAGE_API_URL}/ai-image-excluded-visual-styles`
const AI_IMAGE_TEMPLATES_URL = `${AI_IMAGE_API_URL}/ai-image-video-templates`
const AI_IMAGE_JOBS_URL = `${AI_IMAGE_API_URL}/ai-image-video-jobs`
const AI_IMAGE_GENERATION_JOBS_URL = `${AI_IMAGE_API_URL}/ai-image-jobs`

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return response.json() as Promise<T>
  }

  let message = `Request failed (${response.status})`
  try {
    const body = await response.json() as ApiError
    message = body.message || message
  } catch {
    // Keep the status-based fallback when the response body is not JSON.
  }

  throw new Error(message)
}

export async function createJob(
  trackUrl: string,
  template: TrackVideoTemplate,
): Promise<CreateTrackVideoJobResult> {
  const response = await fetch(JOBS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      trackUrl,
      template,
    }),
  })

  return parseResponse<CreateTrackVideoJobResult>(response)
}

export async function getAllJobs(): Promise<TrackVideoJob[]> {
  const jobs: TrackVideoJob[] = []
  let after: string | null = null

  do {
    const url = new URL(JOBS_URL)
    url.searchParams.set('limit', '50')
    if (after) {
      url.searchParams.set('after', after)
    }

    const page = await parseResponse<JobsPage>(await fetch(url))
    jobs.push(...page.data)
    after = page.paging.cursors.after
  } while (after)

  return jobs
}

export async function getVideoTemplates(): Promise<VideoTemplateCatalogueItem[]> {
  const response = await fetch(VIDEO_TEMPLATES_URL)
  return (await parseResponse<VideoTemplateCatalogue>(response)).data
}

interface BandLabPostResponse {
  id: string
  creator?: {
    name?: string
    username?: string
  }
  revision?: {
    id: string
    song?: {
      name?: string
      author?: {
        name?: string
        username?: string
      }
      picture?: {
        url?: string
      }
    }
  }
}

function isSupportedPreviewCoverUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:'
      && /^\/v1\.(?:0|3)\/songs\/[0-9a-f-]+\/$/i.test(url.pathname)
  } catch {
    return false
  }
}

export async function getCoverPreviewTrack(
  trackUrl: string,
  signal?: AbortSignal,
): Promise<CoverPreviewTrackMetadata> {
  const url = new URL(trackUrl)
  const apiHost = url.hostname === 'test.bandlab.com'
    ? 'api-test.bandlab.com'
    : 'api.bandlab.com'
  const postId = url.pathname.split('/').filter(Boolean)[1]
  const expectedRevisionId = url.searchParams.get('revId')
  const response = await fetch(`https://${apiHost}/v1.3/posts/${encodeURIComponent(postId)}`, {
    cache: 'no-store',
    signal,
  })
  const post = await parseResponse<BandLabPostResponse>(response)
  const song = post.revision?.song
  const pictureUrl = song?.picture?.url?.trim()
  const artistName = song?.author?.name?.trim()
    || post.creator?.name?.trim()
    || song?.author?.username?.trim()
    || post.creator?.username?.trim()

  if (
    post.id.toLowerCase() !== postId.toLowerCase()
    || (expectedRevisionId && post.revision?.id.toLowerCase() !== expectedRevisionId.toLowerCase())
    || !song?.name?.trim()
    || !artistName
    || !pictureUrl
  ) {
    throw new Error('The selected track metadata is incomplete or no longer matches its configured revision.')
  }

  return {
    trackUrl,
    name: song.name.trim(),
    artistName,
    artistUsername: song.author?.username?.trim() || post.creator?.username?.trim() || null,
    pictureUrl,
    previewSupported: isSupportedPreviewCoverUrl(pictureUrl),
  }
}

export async function createCoverVideoPreview(
  trackCoverUrl: string,
  template: TrackVideoTemplate,
  options: CoverVideoPreviewRenderOptions,
  signal?: AbortSignal,
): Promise<CoverVideoPreview> {
  const response = await fetch(VIDEO_PREVIEWS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ trackCoverUrl, template, ...options }),
    cache: 'no-store',
    signal,
  })

  return parseResponse<CoverVideoPreview>(response)
}

async function createCoverPreviewBatch(
  url: string,
  trackCoverUrl: string,
  signal?: AbortSignal,
): Promise<CoverPreviewBatchResult> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ trackCoverUrl }),
    cache: 'no-store',
    signal,
  })

  return parseResponse<CoverPreviewBatchResult>(response)
}

export function createCoverVideoPreviewBatch(
  trackCoverUrl: string,
  signal?: AbortSignal,
): Promise<CoverPreviewBatchResult> {
  return createCoverPreviewBatch(VIDEO_PREVIEW_BATCHES_URL, trackCoverUrl, signal)
}

export function createCoverImagePreviewBatch(
  trackCoverUrl: string,
  signal?: AbortSignal,
): Promise<CoverPreviewBatchResult> {
  return createCoverPreviewBatch(IMAGE_PREVIEW_BATCHES_URL, trackCoverUrl, signal)
}

export async function getAiImageVisualStyles(): Promise<AiImageVisualStyle[]> {
  const response = await fetch(AI_IMAGE_STYLES_URL)
  const styles = (await parseResponse<AiImageCatalogue<AiImageVisualStyle>>(response)).data

  return styles.map(style => ({
    ...style,
    exampleImageUrls: shuffled(style.exampleImageUrls),
  })).reverse()
}

export async function getAiImageExcludedVisualStyles(): Promise<AiImageVisualStyle[]> {
  const response = await fetch(AI_IMAGE_EXCLUDED_STYLES_URL)
  const styles = (await parseResponse<AiImageCatalogue<AiImageVisualStyle>>(response)).data

  return styles.map(style => ({
    ...style,
    exampleImageUrls: shuffled(style.exampleImageUrls),
  })).reverse()
}

export async function getAiImageVideoTemplates(): Promise<AiImageVideoTemplate[]> {
  const response = await fetch(AI_IMAGE_TEMPLATES_URL)
  return (await parseResponse<AiImageCatalogue<AiImageVideoTemplate>>(response)).data
}

export async function createAiImageVideoJob(
  trackUrl: string,
  template: string,
  visualStyle: string,
): Promise<CreateAiImageVideoJobResult> {
  const response = await fetch(AI_IMAGE_JOBS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      trackUrl,
      template,
      visualStyle,
    }),
  })

  return parseResponse<CreateAiImageVideoJobResult>(response)
}

export async function getAiImageVideoJobs(): Promise<AiImageVideoJob[]> {
  const url = new URL(AI_IMAGE_JOBS_URL)
  url.searchParams.set('limit', '50')

  const page = await parseResponse<AiImageVideoJobsPage>(await fetch(url))
  return page.data
}

export async function createAiGeneratedImageJob(
  prompt: string,
  trackUrl?: string,
): Promise<CreateAiGeneratedImageJobResult> {
  const normalizedTrackUrl = trackUrl?.trim()
  const response = await fetch(AI_IMAGE_GENERATION_JOBS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: prompt.trim(),
      ...(normalizedTrackUrl ? { trackUrl: normalizedTrackUrl } : {}),
    }),
  })

  return parseResponse<CreateAiGeneratedImageJobResult>(response)
}

export async function getAiGeneratedImageJob(jobId: string): Promise<AiGeneratedImageJob> {
  const response = await fetch(`${AI_IMAGE_GENERATION_JOBS_URL}/${encodeURIComponent(jobId)}`)
  return parseResponse<AiGeneratedImageJob>(response)
}

export async function getAiGeneratedImageJobs(): Promise<AiGeneratedImageJob[]> {
  const url = new URL(AI_IMAGE_GENERATION_JOBS_URL)
  url.searchParams.set('limit', '50')

  const page = await parseResponse<AiGeneratedImageJobsPage>(await fetch(url))
  return page.data
}

export async function deleteAiGeneratedImageJob(jobId: string): Promise<void> {
  const response = await fetch(
    `${AI_IMAGE_GENERATION_JOBS_URL}/${encodeURIComponent(jobId)}`,
    { method: 'DELETE' },
  )

  if (!response.ok) {
    await parseResponse<unknown>(response)
  }
}
