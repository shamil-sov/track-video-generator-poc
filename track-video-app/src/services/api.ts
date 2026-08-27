import type {
  ApiError,
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
  textOverlay?: string,
): Promise<CreateTrackVideoJobResult> {
  const normalizedTextOverlay = textOverlay?.trim()
  const response = await fetch(JOBS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      trackUrl,
      template,
      ...(normalizedTextOverlay ? { textOverlay: normalizedTextOverlay } : {}),
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
