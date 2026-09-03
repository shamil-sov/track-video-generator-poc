import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  API_BASE_URL,
  createAiGeneratedImageJob,
  createAiImageVideoJob,
  createCoverVideoPreview,
  deleteAiGeneratedImageJob,
  getAiGeneratedImageJobs,
  getAiImageExcludedVisualStyles,
  getAiImageVideoTemplates,
  getAiImageVisualStyles,
  getCoverPreviewTrack,
  getVideoTemplates,
} from '@/services/api'

describe('API client', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('shuffles every style example list returned by the catalogue', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [{
        id: 'living-impasto',
        name: 'Living Impasto',
        exampleImageUrls: ['first.jpg', 'second.jpg', 'third.jpg'],
      }],
    }), { status: 200 })))

    const styles = await getAiImageVisualStyles()

    expect(styles[0].exampleImageUrls).toEqual([
      'second.jpg',
      'third.jpg',
      'first.jpg',
    ])
  })

  it('loads only the not-included catalogue in reverse order and shuffles its examples', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [
        { id: 'macro-relic', name: 'Macro Relic', exampleImageUrls: ['first.jpg', 'second.jpg', 'third.jpg'] },
        { id: 'sandglass-fable', name: 'Sandglass Fable', exampleImageUrls: ['only.jpg'] },
      ],
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getAiImageExcludedVisualStyles()).resolves.toEqual([
      { id: 'sandglass-fable', name: 'Sandglass Fable', exampleImageUrls: ['only.jpg'] },
      { id: 'macro-relic', name: 'Macro Relic', exampleImageUrls: ['second.jpg', 'third.jpg', 'first.jpg'] },
    ])
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      `${API_BASE_URL}/track-video-generator/ai-image-excluded-visual-styles`,
    )
  })

  it('supports an empty excluded catalogue', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 })))

    await expect(getAiImageExcludedVisualStyles()).resolves.toEqual([])
  })

  it('reports excluded catalogue API failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      message: 'Excluded styles unavailable',
    }), { status: 503 })))

    await expect(getAiImageExcludedVisualStyles()).rejects.toThrow('Excluded styles unavailable')
  })

  it('loads the cover-video template catalogue without changing its order or examples', async () => {
    const templates = [
      {
        id: 'orbit',
        name: 'Sonic Halo',
        exampleVideoUrls: ['orbit-1.mp4', 'orbit-2.mp4'],
      },
      {
        id: '3d-style',
        name: 'Silk Current',
        exampleVideoUrls: ['silk-1.mp4', 'silk-2.mp4'],
      },
    ]
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: templates,
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getVideoTemplates()).resolves.toEqual(templates)
    expect(String(fetchMock.mock.calls[0][0])).toContain('/track-video-generator/video-templates')
  })

  it.each([
    {
      trackUrl: 'https://test.bandlab.com/track/8398d42e-0504-40c6-b882-bbf42294c641?revId=bef1e49f-d197-4d4f-83f4-fb06eab5c6b0',
      apiHost: 'api-test.bandlab.com',
      pictureUrl: 'https://bl-uat-images.azureedge.net/v1.3/songs/11111111-1111-1111-1111-111111111111/',
      previewSupported: true,
    },
    {
      trackUrl: 'https://www.bandlab.com/track/8398d42e-0504-40c6-b882-bbf42294c641?revId=bef1e49f-d197-4d4f-83f4-fb06eab5c6b0',
      apiHost: 'api.bandlab.com',
      pictureUrl: 'https://bl-prod-images.azureedge.net/v1.3/users/profile-picture-id/',
      previewSupported: false,
    },
  ])('loads preview metadata from the matching BandLab environment: $apiHost', async ({
    trackUrl,
    apiHost,
    pictureUrl,
    previewSupported,
  }) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: '8398d42e-0504-40c6-b882-bbf42294c641',
      creator: { name: 'Post creator', username: 'post_creator' },
      revision: {
        id: 'bef1e49f-d197-4d4f-83f4-fb06eab5c6b0',
        song: {
          name: 'Blue Ridge Mountains',
          author: { name: 'Track artist', username: 'track_artist' },
          picture: { url: pictureUrl },
        },
      },
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getCoverPreviewTrack(trackUrl)).resolves.toEqual({
      trackUrl,
      name: 'Blue Ridge Mountains',
      artistName: 'Track artist',
      artistUsername: 'track_artist',
      pictureUrl,
      previewSupported,
    })
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      `https://${apiHost}/v1.3/posts/8398d42e-0504-40c6-b882-bbf42294c641`,
      { cache: 'no-store', signal: undefined },
    )
  })

  it('rejects track metadata when the configured revision no longer matches', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: '8398d42e-0504-40c6-b882-bbf42294c641',
      creator: { name: 'Artist' },
      revision: {
        id: '00000000-0000-0000-0000-000000000000',
        song: { name: 'Changed track', picture: { url: 'https://bl-uat-images.azureedge.net/v1.3/songs/cover/' } },
      },
    }), { status: 200 })))

    await expect(getCoverPreviewTrack(
      'https://test.bandlab.com/track/8398d42e-0504-40c6-b882-bbf42294c641?revId=bef1e49f-d197-4d4f-83f4-fb06eab5c6b0',
    )).rejects.toThrow('no longer matches its configured revision')
  })

  it('requests a new synchronous cover preview without adding client-side cache data', async () => {
    const result = {
      previewId: 'preview-id',
      template: 'orbit',
      resolution: '720x1280',
      frameRate: 24,
      status: 'completed',
      triggeredAt: '2026-09-02T08:00:00Z',
      processingStartedAt: '2026-09-02T08:00:00.015Z',
      finishedAt: '2026-09-02T08:00:01.250Z',
      imageDownloadDurationMs: 110,
      renderDurationMs: 920,
      uploadDurationMs: 90,
      processingDurationMs: 1235,
      totalDurationMs: 1250,
      videoUrl: 'https://cdn.example/video.mp4',
    }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(result), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(createCoverVideoPreview(
      'https://bl-prod-images.azureedge.net/v1.3/songs/cover-id/',
      'orbit',
      { resolution: '720x1280', frameRate: 24 },
    )).resolves.toEqual(result)
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      `${API_BASE_URL}/track-video-generator/video-previews`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackCoverUrl: 'https://bl-prod-images.azureedge.net/v1.3/songs/cover-id/',
          template: 'orbit',
          resolution: '720x1280',
          frameRate: 24,
        }),
        cache: 'no-store',
        signal: undefined,
      },
    )
  })

  it('preserves empty and single-image example lists', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [
        { id: 'empty', name: 'Empty', exampleImageUrls: [] },
        { id: 'single', name: 'Single', exampleImageUrls: ['only.jpg'] },
      ],
    }), { status: 200 })))

    const styles = await getAiImageVisualStyles()

    expect(styles.map(style => style.exampleImageUrls)).toEqual([['only.jpg'], []])
  })

  it.each([
    {
      exampleVideos: [1, 2, 3, 4].map(index => ({
        videoUrl: `preview-${index}.mp4`,
        visualStyle: { id: `style-${index}`, name: `Visual Style ${index}` },
      })),
      exampleVideoUrls: ['first.mp4', 'second.mp4', 'third.mp4', 'fourth.mp4'],
    },
    { exampleVideoUrls: ['first.mp4', 'second.mp4', 'third.mp4', 'fourth.mp4'] },
    {},
  ])('loads new and legacy AI-video template catalogue responses: %j', async previewFields => {
    const templates = [{
      id: 'vinyl-orbit',
      name: 'Vinyl Launch',
      description: 'A record emerges from the generated artwork.',
      exampleVideoUrl: 'canonical.mp4',
      ...previewFields,
    }]
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: templates,
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getAiImageVideoTemplates()).resolves.toEqual(templates)
    expect(String(fetchMock.mock.calls[0][0])).toContain('/track-video-generator/ai-image-video-templates')
  })

  it('submits AI-image video jobs with only the track URL and selected catalogue IDs', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      jobId: 'video-job',
      status: 'queued',
      triggeredAt: '2026-08-27T10:00:00Z',
    }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)
    const trackUrl = 'https://test.bandlab.com/track/5f42bf92-e3de-ed11-8aae-501ac5ee31b6'

    await createAiImageVideoJob(trackUrl, 'vinyl-orbit', 'living-impasto')

    const [url, request] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('/track-video-generator/ai-image-video-jobs')
    expect(request.method).toBe('POST')
    expect(JSON.parse(request.body)).toEqual({
      trackUrl,
      template: 'vinyl-orbit',
      visualStyle: 'living-impasto',
    })
  })

  it('shows every available visual style in reverse catalogue order', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [
        { id: 'living-impasto', name: 'Living Impasto', exampleImageUrls: ['kept.jpg'] },
        { id: 'moire-rotor-ballet', name: 'Moire Rotor Ballet', exampleImageUrls: ['hidden.jpg'] },
        { id: 'sandglass-fable', name: 'Sandglass Fable', exampleImageUrls: ['hidden-too.jpg'] },
      ],
    }), { status: 200 })))

    const styles = await getAiImageVisualStyles()

    expect(styles.map(style => style.id)).toEqual([
      'sandglass-fable',
      'moire-rotor-ballet',
      'living-impasto',
    ])
  })

  it.each([getAiImageVisualStyles, getAiImageExcludedVisualStyles])(
    'reverses visual styles without mutating the response or alternating order on reload',
    async loadStyles => {
      const data = [
        { id: 'first', name: 'First', exampleImageUrls: ['first.jpg'] },
        { id: 'second', name: 'Second', exampleImageUrls: ['second.jpg'] },
        { id: 'third', name: 'Third', exampleImageUrls: ['third.jpg'] },
      ]
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data }),
      }))

      expect((await loadStyles()).map(style => style.id)).toEqual(['third', 'second', 'first'])
      expect((await loadStyles()).map(style => style.id)).toEqual(['third', 'second', 'first'])
      expect(data.map(style => style.id)).toEqual(['first', 'second', 'third'])
    },
  )

  it('submits a trimmed image prompt with optional track context', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      jobId: 'image-job',
      status: 'queued',
      triggeredAt: '2026-08-26T10:00:00Z',
    }), { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)

    await createAiGeneratedImageJob(
      '  Cover art for {trackName}  ',
      '  https://test.bandlab.com/track/5f42bf92-e3de-ed11-8aae-501ac5ee31b6  ',
    )

    const [url, request] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('/track-video-generator/ai-image-jobs')
    expect(JSON.parse(request.body)).toEqual({
      prompt: 'Cover art for {trackName}',
      trackUrl: 'https://test.bandlab.com/track/5f42bf92-e3de-ed11-8aae-501ac5ee31b6',
    })
  })

  it('loads the latest 50 generated images', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [],
      paging: {
        itemsCount: 0,
        limit: 50,
        cursors: { after: null },
      },
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await getAiGeneratedImageJobs()

    expect(String(fetchMock.mock.calls[0][0])).toContain('ai-image-jobs?limit=50')
  })

  it('deletes a generated image job without expecting a response body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await deleteAiGeneratedImageJob('image-job')

    expect(String(fetchMock.mock.calls[0][0])).toContain('/ai-image-jobs/image-job')
    expect(fetchMock.mock.calls[0][1]).toEqual({ method: 'DELETE' })
  })
})
