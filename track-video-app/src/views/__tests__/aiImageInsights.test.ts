// @vitest-environment happy-dom

import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter, RouterLink } from 'vue-router'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App.vue'
import appRouter from '@/router'
import { useAiImageVideoJobs } from '@/composables/useAiImageVideoJobs'
import {
  getAiImageVideoJobs,
  getAiImageVideoTemplates,
  getAiImageVisualStyles,
  getAllJobs,
  getVideoTemplates,
} from '@/services/api'
import type { AiImageVideoJob } from '@/types/aiImageTrackVideo'

vi.mock('@/services/api', () => ({
  createJob: vi.fn(),
  getAllJobs: vi.fn(),
  getVideoTemplates: vi.fn(),
  createAiImageVideoJob: vi.fn(),
  getAiImageVideoJobs: vi.fn(),
  getAiImageVideoTemplates: vi.fn(),
  getAiImageVisualStyles: vi.fn(),
}))

const containerStub = defineComponent({ template: '<div><slot /></div>' })
const buttonStub = defineComponent({
  inheritAttrs: false,
  components: { RouterLink },
  props: ['to', 'variant'],
  template: `
    <RouterLink v-if="to" :to="to" :data-variant="variant" v-bind="$attrs"><slot /></RouterLink>
    <button v-else :data-variant="variant" v-bind="$attrs"><slot /></button>
  `,
})

function job(jobId: string, totalDurationMs: number, status: AiImageVideoJob['status'] = 'completed'): AiImageVideoJob {
  return {
    jobId,
    trackUrl: 'https://test.bandlab.com/track/5f42bf92-e3de-ed11-8aae-501ac5ee31b6',
    postId: '5f42bf92-e3de-ed11-8aae-501ac5ee31b6',
    revisionId: null,
    template: 'orbit',
    visualStyle: 'living-impasto',
    assignedGenre: null,
    status,
    track: null,
    triggeredAt: '2026-08-27T10:00:00Z',
    processingStartedAt: '2026-08-27T10:00:01Z',
    finishedAt: '2026-08-27T10:00:30Z',
    updatedAt: '2026-08-27T10:00:30Z',
    queueDurationMs: 1000,
    processingDurationMs: totalDurationMs - 1000,
    totalDurationMs,
    videoUrl: null,
    thumbnailUrl: null,
    error: null,
  }
}

async function mountPage(url = '/ai-image-videos/insights') {
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
        VIcon: containerStub,
        VChip: containerStub,
        VSnackbar: containerStub,
        VTextField: true,
        VSelect: true,
        VSkeletonLoader: true,
        AiImageJobCard: true,
        AiVideoTemplatePicker: true,
        AiVisualStylePicker: true,
      },
    },
  })
  await flushPromises()
  return { wrapper, router }
}

enableAutoUnmount(afterEach)

describe('AI-video insights navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const state = useAiImageVideoJobs()
    state.stopPolling()
    state.jobs.value = []
    state.videoTemplates.value = []
    state.visualStyles.value = []
    state.clearError()
    vi.mocked(getAiImageVideoJobs).mockResolvedValue([
      job('first', 20000),
      job('second', 40000),
      job('failed', 5000, 'failed'),
    ])
    vi.mocked(getAiImageVideoTemplates).mockResolvedValue([{
      id: 'orbit', name: 'Sonic Halo', description: 'Spectrum arcs', exampleVideoUrl: 'orbit.mp4',
    }])
    vi.mocked(getAiImageVisualStyles).mockResolvedValue([{
      id: 'living-impasto', name: 'Living Impasto', exampleImageUrls: ['style.jpg'],
    }])
  })

  afterEach(() => useAiImageVideoJobs().stopPolling())

  it('loads insights directly using only AI jobs and completed-job timings', async () => {
    const { wrapper } = await mountPage()

    expect(getAiImageVideoJobs).toHaveBeenCalledOnce()
    expect(getAllJobs).not.toHaveBeenCalled()
    expect(getVideoTemplates).not.toHaveBeenCalled()
    expect(wrapper.find('.generator-card').exists()).toBe(false)
    expect(wrapper.find('.library-section').exists()).toBe(false)
    expect(wrapper.findAll('.metric-card strong').map(value => value.text())).toEqual(['30 s', '40 s'])
    expect(wrapper.findAll('tbody td').map(value => value.text())).toEqual(['Sonic Halo', '3', '30 s', '40 s'])
    expect(wrapper.get('.app-nav [aria-label="AI-image videos"]').attributes('data-variant')).toBe('tonal')
    expect(wrapper.get('.app-nav [aria-label="Cover videos"]').attributes('data-variant')).toBe('text')
    expect(wrapper.findAll('.app-nav a')).toHaveLength(3)
    expect(wrapper.get('.ai-video-section-nav a[href="/ai-image-videos/insights"]').attributes('data-variant')).toBe('tonal')
  })

  it('keeps generation and insights in separate sub-tabs and supports returning via history', async () => {
    const { wrapper, router } = await mountPage('/ai-image-videos')
    expect(wrapper.find('.generator-card').exists()).toBe(true)
    expect(wrapper.find('.library-section').exists()).toBe(true)
    expect(wrapper.find('.performance-section').exists()).toBe(false)

    await wrapper.get('.ai-video-section-nav a[href="/ai-image-videos/insights"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('ai-image-insights')
    expect(wrapper.find('.performance-section').exists()).toBe(true)
    expect(wrapper.find('.generator-card').exists()).toBe(false)

    router.back()
    await flushPromises()
    expect(router.currentRoute.value.name).toBe('ai-image-videos')
    expect(wrapper.find('.generator-card').exists()).toBe(true)
    expect(wrapper.find('.performance-section').exists()).toBe(false)
    expect(wrapper.get('.ai-video-section-nav a[href="/ai-image-videos"]').attributes('data-variant')).toBe('tonal')
  })

  it('refreshes AI metrics without loading cover jobs', async () => {
    const { wrapper } = await mountPage()
    vi.mocked(getAiImageVideoJobs).mockResolvedValue([job('latest', 10000)])
    await wrapper.get('[aria-label="Refresh AI-video insights"]').trigger('click')
    await flushPromises()

    expect(getAiImageVideoJobs).toHaveBeenCalledTimes(2)
    expect(wrapper.findAll('.metric-card strong').map(value => value.text())).toEqual(['10 s', '10 s'])
    expect(getAllJobs).not.toHaveBeenCalled()
  })

  it('shows loading, empty, and recoverable error states on the standalone insights page', async () => {
    let resolveJobs!: (jobs: AiImageVideoJob[]) => void
    vi.mocked(getAiImageVideoJobs).mockImplementationOnce(() => new Promise(resolve => {
      resolveJobs = resolve
    }))
    const { wrapper } = await mountPage()
    expect(wrapper.findAll('v-skeleton-loader-stub')).toHaveLength(2)
    expect(wrapper.find('.metric-card').exists()).toBe(false)

    resolveJobs([])
    await flushPromises()
    expect(wrapper.get('.no-data').text()).toContain('No AI-video jobs yet')
    expect(wrapper.findAll('.metric-card strong').map(value => value.text())).toEqual(['—', '—'])

    vi.mocked(getAiImageVideoJobs).mockRejectedValueOnce(new Error('AI jobs unavailable'))
    await wrapper.get('[aria-label="Refresh AI-video insights"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('AI jobs unavailable')

    vi.mocked(getAiImageVideoJobs).mockResolvedValue([job('recovered', 15000)])
    await wrapper.get('[aria-label="Refresh AI-video insights"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).not.toContain('AI jobs unavailable')
    expect(wrapper.findAll('.metric-card strong').map(value => value.text())).toEqual(['15 s', '15 s'])
  })
})
