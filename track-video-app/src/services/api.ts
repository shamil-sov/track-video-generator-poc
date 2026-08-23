import type {
  ApiError,
  CreateTrackVideoJobResult,
  JobsPage,
  TrackVideoJob,
  TrackVideoTemplate,
} from '@/types/trackVideo'
import type {
  AiImageCatalogue,
  AiImageVideoJob,
  AiImageVideoJobsPage,
  AiImageVideoTemplate,
  AiImageVisualStyle,
  CreateAiImageVideoJobResult,
} from '@/types/aiImageTrackVideo'

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL
  || 'https://septxumlfc.execute-api.ap-southeast-1.amazonaws.com/api/v1.3'
).replace(/\/$/, '')

const JOBS_URL = `${API_BASE_URL}/track-video-generator/jobs`

export const AI_IMAGE_API_BASE_URL = (
  import.meta.env.VITE_AI_IMAGE_API_BASE_URL
  || 'https://test.aws.bandlab.com/api/v1.3'
).replace(/\/$/, '')

const AI_IMAGE_API_URL = `${AI_IMAGE_API_BASE_URL}/track-video-generator`
const AI_IMAGE_STYLES_URL = `${AI_IMAGE_API_URL}/ai-image-visual-styles`
const AI_IMAGE_TEMPLATES_URL = `${AI_IMAGE_API_URL}/ai-image-video-templates`
const AI_IMAGE_JOBS_URL = `${AI_IMAGE_API_URL}/ai-image-video-jobs`

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

export async function getAiImageVisualStyles(): Promise<AiImageVisualStyle[]> {
  const response = await fetch(AI_IMAGE_STYLES_URL)
  return (await parseResponse<AiImageCatalogue<AiImageVisualStyle>>(response)).data
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
