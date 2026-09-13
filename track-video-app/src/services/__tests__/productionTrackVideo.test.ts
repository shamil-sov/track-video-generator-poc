import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createProductionPreviews, getProductionGeneration, normalizeTrackVideosBaseUrl,
  resolveProductionTrack, startProductionGeneration, TRACK_VIDEOS_API_BASE_URL,
} from '@/services/productionTrackVideo'
import { segmentDuration, validSegmentStart } from '@/types/productionTrackVideo'

const postId = '8398d42e-0504-40c6-b882-bbf42294c641'
const revisionId = 'bef1e49f-d197-4d4f-83f4-fb06eab5c6b0'
const revision = {
  id: revisionId, postId, isPublic: true,
  song: { name: 'Track', author: { name: 'Artist' }, picture: { url: 'https://cdn.example/cover.jpg' } },
  mixdown: { duration: '50.25', file: 'https://cdn.example/audio.m4a' },
}
afterEach(() => vi.unstubAllGlobals())

describe('Production Track Video contract', () => {
  it('resolves the pinned revision and its audio from the track URL environment', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(revision)))
    vi.stubGlobal('fetch', fetchMock)
    const track = await resolveProductionTrack(`https://test.bandlab.com/track/${postId}?revId=${revisionId}`)
    expect(String(fetchMock.mock.calls[0][0])).toBe(`https://api-test.bandlab.com/v1.3/revisions/${revisionId}?edit=false`)
    expect(track).toMatchObject({ name: 'Track', artistName: 'Artist', audioUrl: revision.mixdown.file, durationSeconds: 50.25 })
    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty('headers')
  })

  it('uses the current post revision for an unpinned production track URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: postId, revision })))
    vi.stubGlobal('fetch', fetchMock)
    await resolveProductionTrack(`https://www.bandlab.com/track/${postId}`)
    expect(String(fetchMock.mock.calls[0][0])).toBe(`https://api.bandlab.com/v1.3/posts/${postId}`)
  })

  it('rejects a pinned revision belonging to a different post', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...revision, postId: revisionId }))))
    await expect(resolveProductionTrack(`https://bandlab.com/track/${postId}?revId=${revisionId}`)).rejects.toThrow('does not belong')
  })

  it.each(['https://bandlab.com.evil.example/track/', 'http://bandlab.com/track/', 'https://example.com/track/'])(
    'rejects invalid track origins without fetching: %s', async prefix => {
      const fetchMock = vi.fn()
      vi.stubGlobal('fetch', fetchMock)
      await expect(resolveProductionTrack(`${prefix}${postId}`)).rejects.toThrow('HTTPS BandLab')
      expect(fetchMock).not.toHaveBeenCalled()
    },
  )

  it('rejects missing audio instead of submitting an invalid generation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...revision, mixdown: null }))))
    await expect(resolveProductionTrack(`https://bandlab.com/track/${postId}?revId=${revisionId}`)).rejects.toThrow('missing a cover, playable audio, or duration')
  })

  it('uses separate preview and generation contracts and polls only the returned job ID', async () => {
    const previews = [{ templateId: 'audio-ring', videoPreviewUrl: 'preview.mp4', thumbnailUrl: 'thumbnail.jpg' }]
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: previews })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ jobId: 'job-id', status: 'queued' }), { status: 202 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ jobId: 'job-id', status: 'completed', templateId: 'audio-ring', videoUrl: 'video.mp4' })))
    vi.stubGlobal('fetch', fetchMock)
    const base = TRACK_VIDEOS_API_BASE_URL
    expect(base).toBe('https://yl3aoei9te.execute-api.ap-southeast-1.amazonaws.com/api/v1.3')
    const request = { trackCoverUrl: revision.song.picture.url, trackAudioUrl: revision.mixdown.file, templateId: 'audio-ring' as const, startTimeSeconds: 47.25 }
    await expect(createProductionPreviews(base, request.trackCoverUrl, ' Bearer test-token ')).resolves.toEqual(previews)
    await startProductionGeneration(base, request, 'test-token')
    await getProductionGeneration(base, 'job-id', 'test-token')
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `${base}/track-videos/previews`, `${base}/track-videos/generations`, `${base}/track-videos/generations/job-id`,
    ])
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ trackCoverUrl: request.trackCoverUrl })
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual(request)
    expect(fetchMock.mock.calls[2][1]).toMatchObject({ cache: 'no-store' })
    for (const [url, options] of fetchMock.mock.calls) {
      expect(options.headers.Authorization).toBe('Bearer test-token')
      expect(url).not.toContain('test-token')
      expect(options.body || '').not.toContain('test-token')
    }
  })

  it.each(['', '   ', 'Bearer '])('does not send production requests without a token: %j', async token => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const base = TRACK_VIDEOS_API_BASE_URL
    await expect(createProductionPreviews(base, revision.song.picture.url, token)).rejects.toThrow('Enter a BandLab bearer token')
    await expect(startProductionGeneration(base, {
      trackCoverUrl: revision.song.picture.url, trackAudioUrl: revision.mixdown.file, templateId: 'audio-ring', startTimeSeconds: 0,
    }, token)).rejects.toThrow('Enter a BandLab bearer token')
    await expect(getProductionGeneration(base, 'job-id', token)).rejects.toThrow('Enter a BandLab bearer token')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([[401, 'invalid or expired'], [403, 'Access denied']] as const)('explains authentication failure %s', async (status, message) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status })))
    await expect(getProductionGeneration(TRACK_VIDEOS_API_BASE_URL, 'job-id', 'test-token')).rejects.toThrow(message)
  })

  it('does not treat TBD as a usable API address', () => {
    expect(() => normalizeTrackVideosBaseUrl('TBD')).toThrow()
    expect(() => normalizeTrackVideosBaseUrl('https://api.example/api/v1.3?token=secret')).toThrow()
  })

  it('supports fractional starts, short tracks and clips near the end', () => {
    expect(validSegmentStart(47.25, 50.25)).toBe(true)
    expect(segmentDuration(50.25, 47.25)).toBe(3)
    expect(segmentDuration(10, 0)).toBe(10)
    expect(segmentDuration(50.25, 0)).toBe(15)
    for (const value of [null, '', ' ', -1, NaN, Infinity, 50.25, 51]) expect(validSegmentStart(value, 50.25)).toBe(false)
  })
})
