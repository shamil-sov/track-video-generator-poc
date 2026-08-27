import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  API_BASE_URL,
  createAiGeneratedImageJob,
  createAiImageVideoJob,
  deleteAiGeneratedImageJob,
  getAiGeneratedImageJobs,
  getAiImageExcludedVisualStyles,
  getAiImageVideoTemplates,
  getAiImageVisualStyles,
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
