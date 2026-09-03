// @vitest-environment happy-dom

import { defineComponent, ref } from 'vue'
import { createMemoryHistory, createRouter, RouterLink } from 'vue-router'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CoverSectionNav from '@/components/CoverSectionNav.vue'
import { useVideoTemplates } from '@/composables/useVideoTemplates'
import { COVER_PREVIEW_TRACK_URLS } from '@/data/coverPreviewTracks'
import appRouter from '@/router'
import { createCoverVideoPreview, getCoverPreviewTrack } from '@/services/api'
import type { CoverPreviewTrackMetadata, CoverVideoPreview } from '@/types/trackVideo'
import CoverVideoPreviewsView from '@/views/CoverVideoPreviewsView.vue'

vi.mock('@/composables/useVideoTemplates', () => ({ useVideoTemplates: vi.fn() }))
vi.mock('@/services/api', () => ({
  createCoverVideoPreview: vi.fn(),
  getCoverPreviewTrack: vi.fn(),
}))

const templates = ref([
  { id: 'orbit', name: 'Sonic Halo', exampleVideoUrls: ['orbit.mp4'] },
  { id: 'prism-spectrum', name: 'Prism Spectrum', exampleVideoUrls: ['prism.mp4'] },
  { id: '3d-style', name: 'Silk Current', exampleVideoUrls: ['silk.mp4'] },
  { id: 'music-visualizer', name: 'Chromatic Waves', exampleVideoUrls: ['waves.mp4'] },
])
const templatesLoading = ref(false)
const templateError = ref<string | null>(null)
const loadTemplates = vi.fn().mockResolvedValue(undefined)

const containerStub = defineComponent({ template: '<div><slot /><slot name="append" /></div>' })
const alertStub = defineComponent({ template: '<div role="alert"><slot /><slot name="append" /></div>' })
const buttonStub = defineComponent({ template: '<button type="button"><slot /></button>' })
const autocompleteStub = defineComponent({
  props: ['modelValue', 'items'],
  emits: ['update:modelValue'],
  template: `
    <div class="track-options">
      <button
        v-for="item in items"
        :key="item.value"
        type="button"
        class="track-option"
        @click="$emit('update:modelValue', item.value)"
      >{{ item.title }}</button>
    </div>
  `,
})
const carouselStub = defineComponent({
  props: ['templates', 'selectedTemplateId', 'trackName', 'coverUrl', 'preview', 'loading', 'error'],
  emits: ['select'],
  template: `
    <div class="carousel-stub"
      :data-template="selectedTemplateId"
      :data-template-ids="templates.map(template => template.id).join(',')"
      :data-track="trackName"
      :data-cover="coverUrl"
      :data-preview-url="preview?.videoUrl || ''"
      :data-loading="String(loading)"
      :data-error="error || ''"
    >
      <button class="select-orbit" @click="$emit('select', 'orbit')">Orbit</button>
      <button class="select-waves" @click="$emit('select', 'music-visualizer')">Waves</button>
    </div>
  `,
})

const track: CoverPreviewTrackMetadata = {
  trackUrl: COVER_PREVIEW_TRACK_URLS[1],
  name: '2 Of Amerikaz Most Wanted',
  artistName: 'Gordon',
  artistUsername: 'gordon_l',
  pictureUrl: 'https://bl-uat-images.azureedge.net/v1.3/songs/cover-id/',
  previewSupported: true,
}

function preview(template: string, videoUrl: string): CoverVideoPreview {
  return {
    previewId: `${template}-preview`,
    template,
    resolution: '360x640',
    frameRate: 12,
    status: 'completed',
    triggeredAt: '2026-09-02T08:00:00Z',
    processingStartedAt: '2026-09-02T08:00:00.015Z',
    finishedAt: '2026-09-02T08:00:01.250Z',
    imageDownloadDurationMs: 110,
    renderDurationMs: 920,
    uploadDurationMs: 90,
    processingDurationMs: 1235,
    totalDurationMs: 1250,
    videoUrl,
  }
}

function mountView() {
  return mount(CoverVideoPreviewsView, {
    global: {
      stubs: {
        CoverSectionNav: true,
        CoverPreviewTemplateCarousel: carouselStub,
        VContainer: containerStub,
        VCard: containerStub,
        VAlert: alertStub,
        VAutocomplete: autocompleteStub,
        VBtn: buttonStub,
        VChip: containerStub,
        VIcon: containerStub,
        VSkeletonLoader: containerStub,
      },
    },
  })
}

enableAutoUnmount(afterEach)

describe('Cover video previews', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    templates.value = [
      { id: 'orbit', name: 'Sonic Halo', exampleVideoUrls: ['orbit.mp4'] },
      { id: 'prism-spectrum', name: 'Prism Spectrum', exampleVideoUrls: ['prism.mp4'] },
      { id: '3d-style', name: 'Silk Current', exampleVideoUrls: ['silk.mp4'] },
      { id: 'music-visualizer', name: 'Chromatic Waves', exampleVideoUrls: ['waves.mp4'] },
    ]
    templatesLoading.value = false
    templateError.value = null
    vi.mocked(useVideoTemplates).mockReturnValue({
      templates,
      loading: templatesLoading,
      error: templateError,
      loadTemplates,
      templateName: vi.fn(),
      clearError: vi.fn(),
    })
    vi.mocked(getCoverPreviewTrack).mockResolvedValue(track)
    vi.mocked(createCoverVideoPreview).mockResolvedValue(preview('orbit', 'orbit-generated.mp4'))
  })

  it('offers all configured URLs, loads the selected track, and renders its first template', async () => {
    const wrapper = mountView()
    expect(wrapper.findAll('.track-option')).toHaveLength(19)
    expect(wrapper.findAll('.track-option')[0].text()).toBe(COVER_PREVIEW_TRACK_URLS[0])
    expect(wrapper.findAll('.track-option').at(-1)?.text()).toBe(COVER_PREVIEW_TRACK_URLS.at(-1))

    await wrapper.findAll('.track-option')[1].trigger('click')
    await flushPromises()

    expect(getCoverPreviewTrack).toHaveBeenCalledWith(COVER_PREVIEW_TRACK_URLS[1], expect.any(AbortSignal))
    expect(wrapper.get('.selected-track h2').text()).toBe('2 Of Amerikaz Most Wanted')
    expect(wrapper.get('.selected-track p').text()).toContain('Gordon')
    expect(wrapper.get('.selected-track img').attributes('src')).toBe(track.pictureUrl)
    expect(createCoverVideoPreview).toHaveBeenCalledWith(
      track.pictureUrl,
      'orbit',
      { resolution: '360x640', frameRate: 12 },
      expect.any(AbortSignal),
    )
    expect(wrapper.get('.carousel-stub').attributes('data-preview-url')).toBe('orbit-generated.mp4')
    expect(wrapper.get('.carousel-stub').attributes('data-template-ids')).toBe('orbit,music-visualizer')
    expect(templates.value.map(template => template.id)).toEqual([
      'orbit',
      'prism-spectrum',
      '3d-style',
      'music-visualizer',
    ])
  })

  it('generates a fresh preview when resolution or frame rate changes', async () => {
    const wrapper = mountView()
    await wrapper.findAll('.track-option')[1].trigger('click')
    await flushPromises()

    await wrapper.get('.config-option[data-value="720x1280"]').trigger('click')
    await flushPromises()
    expect(createCoverVideoPreview).toHaveBeenLastCalledWith(
      track.pictureUrl,
      'orbit',
      { resolution: '720x1280', frameRate: 12 },
      expect.any(AbortSignal),
    )

    await wrapper.get('.config-option[data-value="24"]').trigger('click')
    await flushPromises()
    expect(createCoverVideoPreview).toHaveBeenLastCalledWith(
      track.pictureUrl,
      'orbit',
      { resolution: '720x1280', frameRate: 24 },
      expect.any(AbortSignal),
    )
    expect(createCoverVideoPreview).toHaveBeenCalledTimes(3)
    expect(wrapper.get('.config-option[data-value="720x1280"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('.config-option[data-value="24"]').attributes('aria-pressed')).toBe('true')
  })

  it('requests a fresh preview on every template click, including repeat selections', async () => {
    const wrapper = mountView()
    await wrapper.findAll('.track-option')[1].trigger('click')
    await flushPromises()

    vi.mocked(createCoverVideoPreview)
      .mockResolvedValueOnce(preview('orbit', 'orbit-second.mp4'))
      .mockResolvedValueOnce(preview('orbit', 'orbit-third.mp4'))
    await wrapper.get('.select-orbit').trigger('click')
    await flushPromises()
    await wrapper.get('.select-orbit').trigger('click')
    await flushPromises()

    expect(createCoverVideoPreview).toHaveBeenCalledTimes(3)
    expect(wrapper.get('.carousel-stub').attributes('data-preview-url')).toBe('orbit-third.mp4')
  })

  it('ignores a stale preview response after another template is selected', async () => {
    const wrapper = mountView()
    await wrapper.findAll('.track-option')[1].trigger('click')
    await flushPromises()

    let resolveOldPreview!: (value: CoverVideoPreview) => void
    vi.mocked(createCoverVideoPreview)
      .mockImplementationOnce(() => new Promise(resolve => {
        resolveOldPreview = resolve
      }))
      .mockResolvedValueOnce(preview('music-visualizer', 'waves-current.mp4'))

    await wrapper.get('.select-orbit').trigger('click')
    await wrapper.get('.select-waves').trigger('click')
    await flushPromises()
    expect(wrapper.get('.carousel-stub').attributes('data-preview-url')).toBe('waves-current.mp4')

    resolveOldPreview(preview('orbit', 'orbit-stale.mp4'))
    await flushPromises()
    expect(wrapper.get('.carousel-stub').attributes('data-template')).toBe('music-visualizer')
    expect(wrapper.get('.carousel-stub').attributes('data-preview-url')).toBe('waves-current.mp4')
  })

  it('shows metadata but does not call the preview API for a profile-picture track', async () => {
    vi.mocked(getCoverPreviewTrack).mockResolvedValueOnce({
      ...track,
      name: 'Blue Ridge Mountains',
      pictureUrl: 'https://bl-uat-images.azureedge.net/v1.3/users/profile-picture/',
      previewSupported: false,
    })
    const wrapper = mountView()
    await wrapper.findAll('.track-option')[0].trigger('click')
    await flushPromises()

    expect(wrapper.get('.selected-track h2').text()).toBe('Blue Ridge Mountains')
    expect(wrapper.get('[role="alert"]').text()).toContain('profile picture instead of a song-cover image')
    expect(wrapper.find('.carousel-stub').exists()).toBe(false)
    expect(createCoverVideoPreview).not.toHaveBeenCalled()
  })

  it('keeps the selected track and template usable when rendering fails', async () => {
    vi.mocked(createCoverVideoPreview).mockRejectedValueOnce(new Error('Image decoding failed.'))
    const wrapper = mountView()
    await wrapper.findAll('.track-option')[1].trigger('click')
    await flushPromises()

    expect(wrapper.get('.selected-track h2').text()).toBe(track.name)
    expect(wrapper.get('.carousel-stub').attributes('data-template')).toBe('orbit')
    expect(wrapper.get('.carousel-stub').attributes('data-preview-url')).toBe('')
    expect(wrapper.get('.carousel-stub').attributes('data-error')).toBe('Image decoding failed.')
  })
})

describe('Cover preview navigation', () => {
  it('registers and highlights the template-preview sub-tab', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: appRouter.options.routes,
    })
    await router.push('/video-previews')
    await router.isReady()
    const linkStub = defineComponent({
      components: { RouterLink },
      props: ['to', 'variant'],
      template: '<RouterLink :to="to" :data-variant="variant"><slot /></RouterLink>',
    })
    const wrapper = mount(CoverSectionNav, {
      global: { plugins: [router], stubs: { VBtn: linkStub } },
    })

    expect(router.currentRoute.value.name).toBe('cover-video-previews')
    expect(wrapper.findAll('a')).toHaveLength(4)
    expect(wrapper.get('a[href="/video-previews"]').text()).toBe('Template previews')
    expect(wrapper.get('a[href="/video-previews"]').attributes('data-variant')).toBe('tonal')
    expect(wrapper.get('a[href="/compare-templates"]').text()).toBe('Compare templates')
  })
})
