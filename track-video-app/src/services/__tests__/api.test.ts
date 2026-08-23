import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAiImageVisualStyles } from '@/services/api'

describe('getAiImageVisualStyles', () => {
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

  it('preserves empty and single-image example lists', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: [
        { id: 'empty', name: 'Empty', exampleImageUrls: [] },
        { id: 'single', name: 'Single', exampleImageUrls: ['only.jpg'] },
      ],
    }), { status: 200 })))

    const styles = await getAiImageVisualStyles()

    expect(styles.map(style => style.exampleImageUrls)).toEqual([[], ['only.jpg']])
  })
})
