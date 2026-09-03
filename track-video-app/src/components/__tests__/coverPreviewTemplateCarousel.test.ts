// @vitest-environment happy-dom

import { defineComponent } from 'vue'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CoverPreviewTemplateCarousel from '@/components/CoverPreviewTemplateCarousel.vue'

const containerStub = defineComponent({ template: '<span><slot /></span>' })
const templates = [
  { id: 'orbit', name: 'Sonic Halo', exampleVideoUrls: ['orbit.mp4'] },
  { id: 'prism', name: 'Prism', exampleVideoUrls: ['prism.mp4'] },
  { id: 'silk', name: 'Silk Current', exampleVideoUrls: ['silk.mp4'] },
]
const preview = {
  previewId: 'preview-id',
  template: 'orbit',
  status: 'completed' as const,
  triggeredAt: '2026-09-02T08:00:00Z',
  processingStartedAt: '2026-09-02T08:00:00.015Z',
  finishedAt: '2026-09-02T08:00:01.250Z',
  imageDownloadDurationMs: 110,
  renderDurationMs: 920,
  uploadDurationMs: 90,
  processingDurationMs: 1235,
  totalDurationMs: 1250,
  videoUrl: 'generated.mp4',
}

function mountCarousel(overrides = {}) {
  return mount(CoverPreviewTemplateCarousel, {
    props: {
      templates,
      selectedTemplateId: 'orbit',
      trackName: 'Home Court',
      coverUrl: 'cover.jpg',
      preview,
      loading: false,
      error: null,
      ...overrides,
    },
    global: {
      stubs: {
        VIcon: containerStub,
        VProgressCircular: containerStub,
      },
    },
  })
}

enableAutoUnmount(afterEach)

describe('Cover preview template carousel', () => {
  it('plays the generated silent preview and keeps catalogue examples passive', () => {
    const wrapper = mountCarousel()
    const generated = wrapper.get('.preview-media video').element as HTMLVideoElement

    expect(generated.getAttribute('src')).toBe('generated.mp4')
    expect(generated.autoplay).toBe(true)
    expect(generated.loop).toBe(true)
    expect(generated.muted).toBe(true)
    expect(generated.controls).toBe(true)
    expect(generated.hasAttribute('poster')).toBe(false)
    expect(wrapper.get('.render-time').text()).toBe('Preview generated in 1.3 s')
    for (const example of wrapper.findAll('.template-option video')) {
      expect((example.element as HTMLVideoElement).autoplay).toBe(false)
      expect((example.element as HTMLVideoElement).muted).toBe(true)
    }
  })

  it('emits every card click, including the already-selected template', async () => {
    const wrapper = mountCarousel()
    const cards = wrapper.findAll('.template-option')

    await cards[0].trigger('click')
    await cards[0].trigger('click')
    await cards[1].trigger('click')
    expect(wrapper.emitted('select')).toEqual([['orbit'], ['orbit'], ['prism']])
  })

  it('loops through templates with external arrows and keyboard navigation', async () => {
    const wrapper = mountCarousel()

    await wrapper.get('[aria-label="Select previous video template"]').trigger('click')
    await wrapper.get('[aria-label="Select next video template"]').trigger('click')
    await wrapper.findAll('.template-option')[1].trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('select')).toEqual([['silk'], ['prism'], ['silk']])
  })

  it('uses a neutral loading state without the track cover and reports failures', () => {
    const wrapper = mountCarousel({ preview: null, loading: true, error: 'Preview rendering failed.' })

    expect(wrapper.find('.preview-media video').exists()).toBe(false)
    expect(wrapper.find('.preview-placeholder img').exists()).toBe(false)
    expect(wrapper.find('.preview-placeholder__shade').exists()).toBe(false)
    expect(wrapper.get('.preview-placeholder__status').text()).toContain('Generating preview')
    expect(wrapper.get('[role="alert"]').text()).toContain('Preview rendering failed.')
  })
})
