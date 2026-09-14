import type {
  ProductionTrack,
  ProductionTrackPreview,
  TrackVideoGeneration,
  TrackVideoGenerationRequest,
} from '@/types/productionTrackVideo'

export const TRACK_VIDEOS_API_BASE_URL = (import.meta.env.VITE_TRACK_VIDEOS_API_BASE_URL
  || 'https://test.aws.bandlab.com/api/v1.3').replace(/\/$/, '')

function authorizationHeaders(bearerToken: string): Record<string, string> {
  const token = bearerToken.trim().replace(/^Bearer(?:\s+|$)/i, '').trim()
  if (!token) throw new Error('Enter a BandLab bearer token before requesting previews or generation.')
  return { Authorization: `Bearer ${token}` }
}

async function readResponse<T>(response: Response, authenticated = false): Promise<T> {
  if (!response.ok) {
    if (authenticated && response.status === 401) throw new Error('The BandLab token is invalid or expired. Enter a fresh token and try again.')
    if (authenticated && response.status === 403) throw new Error('Access denied. Check that your BandLab token has access to this UAT API.')
    const body = await response.json().catch(() => null)
    throw new Error(body?.message || body?.errorMessage || `Request failed (${response.status}).`)
  }
  return response.json() as Promise<T>
}

export function normalizeTrackVideosBaseUrl(value: string): string {
  const url = new URL(value.trim())
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash
    || !/^\/api\/v1\.3\/?$/.test(url.pathname)) {
    throw new Error('Enter an HTTPS API base URL ending in /api/v1.3.')
  }
  return url.toString().replace(/\/$/, '')
}

interface Author {
  name?: string
  username?: string
}

interface Revision {
  id: string
  postId?: string
  isPublic: boolean
  creator?: Author
  song?: { name?: string, author?: Author, picture?: { url?: string } }
  mixdown?: { file?: string, duration?: number | string }
}

function httpsMediaUrl(value?: string): string | null {
  try {
    const url = new URL(value?.trim() || '')
    return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : null
  } catch {
    return null
  }
}

export async function resolveProductionTrack(trackUrl: string, signal?: AbortSignal): Promise<ProductionTrack> {
  let url: URL
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  try {
    url = new URL(trackUrl.trim())
  } catch {
    throw new Error('Enter a full BandLab track URL.')
  }
  const parts = url.pathname.split('/').filter(Boolean)
  const postId = parts[1] || ''
  const revisionId = url.searchParams.get('revId')
  if (url.protocol !== 'https:' || !['test.bandlab.com', 'bandlab.com', 'www.bandlab.com'].includes(url.hostname)
    || url.username || url.password || url.port || parts.length !== 2 || parts[0] !== 'track'
    || !uuid.test(postId) || (revisionId !== null && !uuid.test(revisionId))) {
    throw new Error('Use an HTTPS BandLab /track/{id} URL with an optional valid revId.')
  }

  const host = url.hostname === 'test.bandlab.com' ? 'api-test.bandlab.com' : 'api.bandlab.com'
  let revision: Revision
  let author: Author | undefined
  if (revisionId) {
    revision = await readResponse<Revision>(await fetch(`https://${host}/v1.3/revisions/${revisionId}?edit=false`, {
      cache: 'no-store', signal,
    }))
    if (revision.id?.toLowerCase() !== revisionId.toLowerCase() || revision.postId?.toLowerCase() !== postId.toLowerCase()) {
      throw new Error('The selected revision does not belong to this track.')
    }
  } else {
    const post = await readResponse<{ id: string, revision?: Revision, creator?: Author }>(
      await fetch(`https://${host}/v1.3/posts/${postId}`, { cache: 'no-store', signal }),
    )
    if (post.id?.toLowerCase() !== postId.toLowerCase() || !post.revision) {
      throw new Error('This post does not contain a track revision.')
    }
    revision = post.revision
    author = post.creator
  }

  if (!revision.isPublic) {
    throw new Error('Choose a public track so its cover and audio can be loaded.')
  }
  const pictureUrl = httpsMediaUrl(revision.song?.picture?.url)
  const audioUrl = httpsMediaUrl(revision.mixdown?.file)
  const durationSeconds = Number(revision.mixdown?.duration)
  const name = revision.song?.name?.trim()
  if (!uuid.test(revision.id) || !name || !pictureUrl || !audioUrl || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error('This track is missing a cover, playable audio, or duration.')
  }

  return {
    trackUrl: url.toString(), postId, revisionId: revision.id, name, pictureUrl, audioUrl, durationSeconds,
    artistName: revision.song?.author?.name || revision.creator?.name || author?.name
      || revision.song?.author?.username || revision.creator?.username || author?.username || 'Unknown artist',
  }
}

export async function createProductionPreviews(
  apiBaseUrl: string, trackCoverUrl: string, bearerToken: string, signal?: AbortSignal,
): Promise<ProductionTrackPreview[]> {
  const response = await fetch(`${normalizeTrackVideosBaseUrl(apiBaseUrl)}/track-videos/previews`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...authorizationHeaders(bearerToken) },
    body: JSON.stringify({ trackCoverUrl }), cache: 'no-store', signal,
  })
  return (await readResponse<{ items: ProductionTrackPreview[] }>(response, true)).items
}

export async function startProductionGeneration(
  apiBaseUrl: string, request: TrackVideoGenerationRequest, bearerToken: string, signal?: AbortSignal,
): Promise<TrackVideoGeneration> {
  return readResponse<TrackVideoGeneration>(await fetch(`${normalizeTrackVideosBaseUrl(apiBaseUrl)}/track-videos/generations`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...authorizationHeaders(bearerToken) },
    body: JSON.stringify(request), cache: 'no-store', signal,
  }), true)
}

export async function getProductionGeneration(
  apiBaseUrl: string, jobId: string, bearerToken: string, signal?: AbortSignal,
): Promise<TrackVideoGeneration> {
  return readResponse<TrackVideoGeneration>(await fetch(
    `${normalizeTrackVideosBaseUrl(apiBaseUrl)}/track-videos/generations/${encodeURIComponent(jobId)}`,
    { headers: authorizationHeaders(bearerToken), cache: 'no-store', signal },
  ), true)
}
