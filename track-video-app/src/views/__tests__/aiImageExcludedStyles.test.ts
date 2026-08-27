// @vitest-environment happy-dom

import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter, RouterLink } from 'vue-router'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App.vue'
import appRouter from '@/router'
import { useAiImageVideoJobs } from '@/composables/useAiImageVideoJobs'
import {
  createAiImageVideoJob,
  getAiImageExcludedVisualStyles,
  getAiImageVideoJobs,
  getAiImageVideoTemplates,
  getAiImageVisualStyles,
  getAllJobs,
  getVideoTemplates,
} from '@/services/api'
import type { AiImageVisualStyle } from '@/types/aiImageTrackVideo'

vi.mock('@/services/api', () => ({
  createJob: vi.fn(),
  getAllJobs: vi.fn(),
  getVideoTemplates: vi.fn(),
  createAiImageVideoJob: vi.fn(),
  getAiImageExcludedVisualStyles: vi.fn(),
  getAiImageVideoJobs: vi.fn(),
  getAiImageVideoTemplates: vi.fn(),
  getAiImageVisualStyles: vi.fn(),
}))

const containerStub = defineComponent({ template: '<div><slot /><slot name="append" /></div>' })
const buttonStub = defineComponent({
  inheritAttrs: false,
  components: { RouterLink },
  props: ['to', 'variant', 'loading'],
  template: `
    <RouterLink v-if="to" :to="to" :data-variant="variant" v-bind="$attrs"><slot /></RouterLink>
    <button v-else :data-variant="variant" v-bind="$attrs"><slot /></button>
  `,
})
const imageStub = defineComponent({
  props: ['src', 'alt'],
  template: '<img :src="src" :alt="alt" />',
})

const excludedStyles: AiImageVisualStyle[] = [
  { id: 'macro-relic', name: 'Macro Relic', exampleImageUrls: ['relic-1.jpg', 'relic-2.jpg'] },
  { id: 'sandglass-fable', name: 'Sandglass Fable', exampleImageUrls: ['sandglass.jpg'] },
]
const availableStyle: AiImageVisualStyle = {
  id: 'living-impasto', name: 'Living Impasto', exampleImageUrls: ['impasto.jpg'],
}

async function mountPage(url = '/ai-image-videos/excluded-styles') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: appRouter.options.routes,
  })
  await router.push(url)
  await router.isReady()

  const wrapper = mount(App, {
    global: {
      plugins: [router],
      stubs: {
        VApp: containerStub,
        VAppBar: containerStub,
        VMain: containerStub,
        VContainer: containerStub,
        VCard: containerStub,
        VAlert: containerStub,
        VBtn: buttonStub,
        VImg: imageStub,
        VIcon: containerStub,
        VChip: containerStub,
        VSnackbar: containerStub,
        VTextField: true,
        VSelect: true,
        VSkeletonLoader: true,
        AiImageJobCard: true,
        AiVideoTemplatePicker: true,
      },
    },
  })
  await flushPromises()
  return { wrapper, router }
}

enableAutoUnmount(afterEach)

describe('Not-included AI visual styles', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    const state = useAiImageVideoJobs()
    state.stopPolling()
    state.jobs.value = []
    state.videoTemplates.value = []
    state.visualStyles.value = []
    state.clearError()
    vi.mocked(getAiImageExcludedVisualStyles).mockResolvedValue(excludedStyles)
    vi.mocked(getAiImageVisualStyles).mockResolvedValue([availableStyle])
    vi.mocked(getAiImageVideoTemplates).mockResolvedValue([{
      id: 'orbit', name: 'Sonic Halo', description: 'Spectrum arcs', exampleVideoUrl: 'orbit.mp4',
    }])
    vi.mocked(getAiImageVideoJobs).mockResolvedValue([])
  })

  afterEach(() => useAiImageVideoJobs().stopPolling())

  it('opens directly as a read-only AI-video sub-tab and loads only excluded styles', async () => {
    const { wrapper } = await mountPage()

    expect(wrapper.get('h1').text()).toBe('Not-included visual styles')
    expect(wrapper.get('.styles-header p').text()).toBe(
      'These styles are not currently included in video generation but may be added after a review of their fit for the BandLab audience.',
    )
    expect(wrapper.get('.ai-video-section-nav a[href="/ai-image-videos/excluded-styles"]').text()).toBe('Not-included visual styles')
    expect(getAiImageExcludedVisualStyles).toHaveBeenCalledOnce()
    expect(getAiImageVisualStyles).not.toHaveBeenCalled()
    expect(getAiImageVideoTemplates).not.toHaveBeenCalled()
    expect(getAiImageVideoJobs).not.toHaveBeenCalled()
    expect(getAllJobs).not.toHaveBeenCalled()
    expect(getVideoTemplates).not.toHaveBeenCalled()
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.find('.generator-card').exists()).toBe(false)
    expect(wrapper.find('.library-section').exists()).toBe(false)
    expect(wrapper.findAll('.app-nav a')).toHaveLength(3)
    expect(wrapper.get('.app-nav [aria-label="AI-image videos"]').attributes('data-variant')).toBe('tonal')
    expect(wrapper.findAll('.ai-video-section-nav a')).toHaveLength(3)
    expect(wrapper.get('.ai-video-section-nav a[href="/ai-image-videos/excluded-styles"]').attributes('data-variant')).toBe('tonal')
    expect(wrapper.findAll('.style-card__name').map(name => name.text())).toEqual(['Macro Relic', 'Sandglass Fable'])
    expect(wrapper.get('.selected-preview__copy strong').text()).toBe('Macro Relic')
  })

  it('browses example images and styles without starting generation', async () => {
    const { wrapper } = await mountPage()
    expect(wrapper.get('.selected-preview__image').attributes('src')).toBe('relic-1.jpg')

    await wrapper.get('[aria-label="Next style example"]').trigger('click')
    expect(wrapper.get('.selected-preview__image').attributes('src')).toBe('relic-2.jpg')
    await wrapper.get('[aria-label="Next style example"]').trigger('click')
    expect(wrapper.get('.selected-preview__image').attributes('src')).toBe('relic-1.jpg')
    await wrapper.get('[aria-label="Previous style example"]').trigger('click')
    expect(wrapper.get('.selected-preview__image').attributes('src')).toBe('relic-2.jpg')

    await wrapper.findAll('.style-card')[1].trigger('click')
    expect(wrapper.get('.selected-preview__copy strong').text()).toBe('Sandglass Fable')
    expect(wrapper.get('.selected-preview__image').attributes('src')).toBe('sandglass.jpg')
    expect(wrapper.find('[aria-label="Next style example"]').exists()).toBe(false)

    await wrapper.get('.style-card[aria-checked="true"]').trigger('keydown', { key: 'ArrowLeft' })
    await flushPromises()
    expect(wrapper.get('.selected-preview__image').attributes('src')).toBe('relic-1.jpg')
    expect(createAiImageVideoJob).not.toHaveBeenCalled()
    expect(getAiImageExcludedVisualStyles).toHaveBeenCalledOnce()
  })

  it('keeps excluded styles out of the generation picker when navigating between tabs', async () => {
    const { wrapper, router } = await mountPage('/ai-image-videos')
    expect(getAiImageExcludedVisualStyles).not.toHaveBeenCalled()
    expect(wrapper.findAll('.style-card__name').map(name => name.text())).toEqual(['Living Impasto'])

    await wrapper.get('.ai-video-section-nav a[href="/ai-image-videos/excluded-styles"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('ai-image-excluded-styles')
    expect(wrapper.findAll('.style-card')).toHaveLength(2)
    expect(useAiImageVideoJobs().visualStyles.value).toEqual([availableStyle])

    router.back()
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('ai-image-videos')
    expect(wrapper.findAll('.style-card__name').map(name => name.text())).toEqual(['Living Impasto'])
    expect(getAiImageVisualStyles).toHaveBeenCalledOnce()
    expect(createAiImageVideoJob).not.toHaveBeenCalled()
  })

  it('shows loading and empty states', async () => {
    let resolveStyles!: (styles: AiImageVisualStyle[]) => void
    vi.mocked(getAiImageExcludedVisualStyles).mockImplementationOnce(() => new Promise(resolve => {
      resolveStyles = resolve
    }))
    const { wrapper } = await mountPage()
    expect(wrapper.find('[aria-label="Loading not-included visual styles"]').exists()).toBe(true)
    expect(wrapper.get('[aria-label="Refresh not-included visual styles"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('.empty-state').exists()).toBe(false)

    resolveStyles([])
    await flushPromises()
    expect(wrapper.find('[aria-label="Loading not-included visual styles"]').exists()).toBe(false)
    expect(wrapper.get('.empty-state').text()).toBe('No styles in this list.')
    expect(wrapper.find('.style-picker').exists()).toBe(false)
  })

  it('offers a retry for failed requests without treating errors as an empty catalogue', async () => {
    vi.mocked(getAiImageExcludedVisualStyles).mockRejectedValueOnce(new Error('Excluded styles unavailable'))
    const { wrapper } = await mountPage()
    expect(wrapper.get('[role="alert"]').text()).toContain('Excluded styles unavailable')
    expect(wrapper.find('.empty-state').exists()).toBe(false)

    await wrapper.get('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.findAll('.style-card')).toHaveLength(2)
    expect(getAiImageExcludedVisualStyles).toHaveBeenCalledTimes(2)
  })

  it('preserves the previewed style on refresh and selects a remaining style if it was removed', async () => {
    const { wrapper } = await mountPage()
    await wrapper.findAll('.style-card')[1].trigger('click')
    await wrapper.get('[aria-label="Refresh not-included visual styles"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('.selected-preview__copy strong').text()).toBe('Sandglass Fable')

    vi.mocked(getAiImageExcludedVisualStyles).mockResolvedValueOnce([excludedStyles[0]])
    await wrapper.get('[aria-label="Refresh not-included visual styles"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('.selected-preview__copy strong').text()).toBe('Macro Relic')
    expect(wrapper.findAll('.style-card')).toHaveLength(1)
  })

  it('shows a placeholder for a failed preview without blocking other examples', async () => {
    const { wrapper } = await mountPage()
    await wrapper.get('.selected-preview__image').trigger('error')
    expect(wrapper.get('.selected-preview__media').text()).toContain('No example available')

    await wrapper.get('[aria-label="Next style example"]').trigger('click')
    expect(wrapper.get('.selected-preview__image').attributes('src')).toBe('relic-2.jpg')
  })
})
