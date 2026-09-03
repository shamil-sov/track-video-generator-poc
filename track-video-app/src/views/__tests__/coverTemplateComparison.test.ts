// @vitest-environment happy-dom

import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter, RouterLink } from 'vue-router'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import CoverSectionNav from '@/components/CoverSectionNav.vue'
import { useVideoTemplates } from '@/composables/useVideoTemplates'
import { COVER_PREVIEW_TRACK_URLS } from '@/data/coverPreviewTracks'
import appRouter from '@/router'
import {
  createCoverImagePreviewBatch,
  createCoverVideoPreviewBatch,
  getCoverPreviewTrack,
} from '@/services/api'
import type {
  CoverPreviewBatchResult,
  CoverPreviewTrackMetadata,
} from '@/types/trackVideo'
import CoverTemplateComparisonView from '@/views/CoverTemplateComparisonView.vue'

vi.mock('@/composables/useVideoTemplates', () => ({ useVideoTemplates: vi.fn() }))
vi.mock('@/services/api', () => ({
  createCoverImagePreviewBatch: vi.fn(),
  createCoverVideoPreviewBatch: vi.fn(),
  getCoverPreviewTrack: vi.fn(),
}))

const containerStub = defineComponent({ template: '<div><slot /><slot name="append" /></div>' })
const alertStub = defineComponent({ template: '<div role="alert"><slot /></div>' })
const buttonStub = defineComponent({
  props: ['disabled'],
  emits: ['click'],
  template: '<button type="button" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
})
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
const dialogStub = defineComponent({
  props: ['modelValue'],
  template: '<div v-if="modelValue" class="dialog-stub"><slot /></div>',
})

const track: CoverPreviewTrackMetadata = {
  trackUrl: COVER_PREVIEW_TRACK_URLS[1],
  name: '2 Of Amerikaz Most Wanted',
  artistName: 'Gordon',
  artistUsername: 'gordon_l',
  pictureUrl: 'https://bl-uat-images.azureedge.net/v1.3/songs/cover-id/',
  previewSupported: true,
}

const videoBatch: CoverPreviewBatchResult = {
  data: [
    { template: 'edge-choir', previewUrl: 'edge.mp4' },
    { template: 'vinyl-sleeve', previewUrl: 'sleeve.mp4' },
    { template: 'orbit', previewUrl: 'orbit.mp4' },
    { template: 'vinyl-orbit', previewUrl: 'vinyl.mp4' },
    { template: 'music-visualizer', previewUrl: 'waves.mp4' },
  ],
  totalDurationMs: 1250,
}

const imageBatch: CoverPreviewBatchResult = {
  data: videoBatch.data.map(item => ({
    ...item,
    previewUrl: item.previewUrl.replace('.mp4', '.jpg'),
  })),
  totalDurationMs: 840,
}

const templateNames: Record<string, string> = {
  orbit: 'Sonic Halo',
  'music-visualizer': 'Chromatic Waves',
  'vinyl-orbit': 'Vinyl Launch',
  'vinyl-sleeve': 'Vinyl Sleeve',
  'edge-choir': 'Edge Choir',
}

function mountView() {
  return mount(CoverTemplateComparisonView, {
    global: {
      stubs: {
        CoverSectionNav: true,
        VAlert: alertStub,
        VAutocomplete: autocompleteStub,
        VBtn: buttonStub,
        VCard: containerStub,
        VChip: containerStub,
        VContainer: containerStub,
        VDialog: dialogStub,
        VIcon: containerStub,
        VProgressCircular: containerStub,
        VSkeletonLoader: containerStub,
      },
    },
  })
}

enableAutoUnmount(afterEach)

describe('Cover template comparison', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useVideoTemplates).mockReturnValue({
      templates: undefined as never,
      loading: undefined as never,
      error: undefined as never,
      loadTemplates: vi.fn(),
      templateName: template => templateNames[template] || template,
      clearError: vi.fn(),
    })
    vi.mocked(getCoverPreviewTrack).mockResolvedValue(track)
    vi.mocked(createCoverVideoPreviewBatch).mockResolvedValue(videoBatch)
    vi.mocked(createCoverImagePreviewBatch).mockResolvedValue(imageBatch)
  })

  it('loads track metadata without generating until the user requests a batch', async () => {
    const wrapper = mountView()

    expect(wrapper.findAll('.track-option')).toHaveLength(19)
    await wrapper.findAll('.track-option')[1].trigger('click')
    await flushPromises()

    expect(getCoverPreviewTrack).toHaveBeenCalledWith(COVER_PREVIEW_TRACK_URLS[1], expect.any(AbortSignal))
    expect(wrapper.get('.selected-track h2').text()).toBe(track.name)
    expect(wrapper.get('.selected-track img').attributes('src')).toBe(track.pictureUrl)
    expect(createCoverVideoPreviewBatch).not.toHaveBeenCalled()
    expect(createCoverImagePreviewBatch).not.toHaveBeenCalled()
  })

  it('generates and orders all five motion previews after an explicit click', async () => {
    const wrapper = mountView()
    await wrapper.findAll('.track-option')[1].trigger('click')
    await flushPromises()

    await wrapper.get('.generate-batch').trigger('click')
    await flushPromises()

    expect(createCoverVideoPreviewBatch).toHaveBeenCalledExactlyOnceWith(track.pictureUrl, expect.any(AbortSignal))
    expect(createCoverImagePreviewBatch).not.toHaveBeenCalled()
    expect(wrapper.findAll('.preview-card')).toHaveLength(5)
    expect(wrapper.findAll('.preview-card__copy strong').map(item => item.text())).toEqual([
      'Sonic Halo',
      'Chromatic Waves',
      'Vinyl Launch',
      'Vinyl Sleeve',
      'Edge Choir',
    ])
    expect(wrapper.get('.results-heading').text()).toContain('Completed in 1.3 s')
    expect(wrapper.findAll('.preview-card video')).toHaveLength(5)
  })

  it('clears motion results on mode change and generates images only when requested', async () => {
    const wrapper = mountView()
    await wrapper.findAll('.track-option')[1].trigger('click')
    await flushPromises()
    await wrapper.get('.generate-batch').trigger('click')
    await flushPromises()

    await wrapper.get('.preview-kind__option[data-type="image"]').trigger('click')
    expect(wrapper.find('.results-section').exists()).toBe(false)
    expect(createCoverImagePreviewBatch).not.toHaveBeenCalled()

    await wrapper.get('.generate-batch').trigger('click')
    await flushPromises()

    expect(createCoverImagePreviewBatch).toHaveBeenCalledExactlyOnceWith(track.pictureUrl, expect.any(AbortSignal))
    expect(wrapper.findAll('.preview-card img')).toHaveLength(5)
    expect(wrapper.get('.results-heading').text()).toContain('Completed in 840 ms')
  })

  it('does not enable generation for unsupported profile-picture tracks', async () => {
    vi.mocked(getCoverPreviewTrack).mockResolvedValueOnce({
      ...track,
      pictureUrl: 'https://bl-uat-images.azureedge.net/v1.3/users/profile-picture/',
      previewSupported: false,
    })
    const wrapper = mountView()
    await wrapper.findAll('.track-option')[0].trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('profile picture')
    expect(wrapper.get('.generate-batch').attributes()).toHaveProperty('disabled')
    expect(createCoverVideoPreviewBatch).not.toHaveBeenCalled()
  })
})

describe('Cover template comparison navigation', () => {
  it('registers and highlights the comparison sub-tab', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: appRouter.options.routes,
    })
    await router.push('/compare-templates')
    await router.isReady()
    const linkStub = defineComponent({
      components: { RouterLink },
      props: ['to', 'variant'],
      template: '<RouterLink :to="to" :data-variant="variant"><slot /></RouterLink>',
    })
    const wrapper = mount(CoverSectionNav, {
      global: { plugins: [router], stubs: { VBtn: linkStub } },
    })

    expect(router.currentRoute.value.name).toBe('cover-template-comparison')
    expect(wrapper.findAll('a')).toHaveLength(4)
    expect(wrapper.get('a[href="/compare-templates"]').text()).toBe('Compare templates')
    expect(wrapper.get('a[href="/compare-templates"]').attributes('data-variant')).toBe('tonal')
  })
})
