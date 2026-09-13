// @vitest-environment happy-dom
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ProductionTrackVideosView from '@/views/ProductionTrackVideosView.vue'
import TrackSegmentPicker from '@/components/TrackSegmentPicker.vue'
import { createProductionPreviews, getProductionGeneration, resolveProductionTrack, startProductionGeneration } from '@/services/productionTrackVideo'
import { TRACK_VIDEO_TEMPLATES } from '@/types/productionTrackVideo'

const config = vi.hoisted(() => ({ base: 'https://api.example/api/v1.3' }))
vi.mock('@/services/productionTrackVideo', () => ({
  get TRACK_VIDEOS_API_BASE_URL() { return config.base },
  createProductionPreviews: vi.fn(), getProductionGeneration: vi.fn(),
  resolveProductionTrack: vi.fn(), startProductionGeneration: vi.fn(),
}))

const container = defineComponent({ template: '<div><slot /></div>' })
const input = defineComponent({
  props: ['modelValue', 'label', 'disabled'], emits: ['update:modelValue'],
  template: '<input :aria-label="label" :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)" />',
})
const button = defineComponent({
  props: ['disabled'], template: '<button :disabled="disabled"><slot /></button>',
})
const select = defineComponent({
  props: ['items'], emits: ['update:modelValue'],
  template: '<select aria-label="Example tracks" @change="$emit(\'update:modelValue\', $event.target.value)"><option value="">Choose</option><option v-for="item in items" :value="item.value">{{ item.title }}</option></select>',
})
const dialog = defineComponent({ props: ['modelValue'], template: '<div v-if="modelValue" class="test-dialog"><slot /></div>' })
const track = {
  trackUrl: 'https://bandlab.com/track/8398d42e-0504-40c6-b882-bbf42294c641', postId: 'post-id', revisionId: 'revision-id',
  name: 'Blue Ridge Mountains', artistName: 'Artist', pictureUrl: 'https://cdn.example/cover.jpg', audioUrl: 'https://cdn.example/audio.m4a', durationSeconds: 50.25,
}
const previews = TRACK_VIDEO_TEMPLATES.map(template => ({ templateId: template.id, videoPreviewUrl: `${template.id}.mp4`, thumbnailUrl: `${template.id}.jpg` }))
const completed = { jobId: 'job-1', status: 'completed' as const, templateId: 'sound-wave' as const, videoUrl: 'https://cdn.example/result.mp4' }
let wrapper: ReturnType<typeof mount>

function mountPage() {
  wrapper = mount(ProductionTrackVideosView, { global: { stubs: {
    VContainer: container, VCard: container, VBtn: button, VTextField: input, VSelect: select,
    VDialog: dialog, VAlert: container, VProgressCircular: true, VIcon: true,
  } } })
  return wrapper
}

async function loadTrack() {
  await wrapper.get('input[aria-label="BandLab track URL"]').setValue(track.trackUrl)
  await wrapper.get('.track-url-form').trigger('submit')
  await flushPromises()
}

async function useToken(value = 'test-token') {
  await wrapper.get('input[aria-label="BandLab bearer token"]').setValue(value)
  await wrapper.get('.token-form').trigger('submit')
  await flushPromises()
}

async function startVideo() {
  await useToken()
  await loadTrack()
  await wrapper.findAll('.production-template-option')[1].trigger('click')
  await wrapper.get('input[aria-label="Start (seconds)"]').setValue('47.25')
  await wrapper.get('.production-generate').trigger('click')
  await flushPromises()
}

beforeEach(() => {
  config.base = 'https://api.example/api/v1.3'
  vi.useFakeTimers()
  vi.resetAllMocks()
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  vi.mocked(resolveProductionTrack).mockResolvedValue(track)
  vi.mocked(createProductionPreviews).mockResolvedValue(previews)
  vi.mocked(startProductionGeneration).mockResolvedValue({ jobId: 'job-1', status: 'queued' })
})
afterEach(() => { wrapper?.unmount(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers() })

describe('Production Track Video page', () => {
  it('masks the token and keeps it out of browser storage', async () => {
    const saveLocal = vi.fn()
    const saveSession = vi.fn()
    vi.stubGlobal('localStorage', { setItem: saveLocal })
    vi.stubGlobal('sessionStorage', { setItem: saveSession })
    mountPage()
    await useToken()
    expect(wrapper.get('input[aria-label="BandLab bearer token"]').attributes('type')).toBe('password')
    expect(saveLocal).not.toHaveBeenCalled()
    expect(saveSession).not.toHaveBeenCalled()
    expect(createProductionPreviews).not.toHaveBeenCalled()
    expect(startProductionGeneration).not.toHaveBeenCalled()
  })

  it('runs previews → selected segment → generation → polling → autoplay and then stops checking', async () => {
    vi.mocked(getProductionGeneration)
      .mockResolvedValueOnce({ jobId: 'job-1', status: 'processing' })
      .mockResolvedValueOnce(completed)
    mountPage()
    await startVideo()
    expect(createProductionPreviews).toHaveBeenCalledWith(config.base, track.pictureUrl, 'test-token', expect.any(AbortSignal))
    expect(startProductionGeneration).toHaveBeenCalledExactlyOnceWith(config.base, {
      trackCoverUrl: track.pictureUrl, trackAudioUrl: track.audioUrl, templateId: 'sound-wave', startTimeSeconds: 47.25,
    }, 'test-token', expect.any(AbortSignal))
    expect(wrapper.get('.generation-player').text()).toContain('Queued')
    await vi.advanceTimersByTimeAsync(2500)
    expect(wrapper.get('.generation-player').text()).toContain('Rendering')
    await vi.advanceTimersByTimeAsync(2500)
    await flushPromises()
    const player = wrapper.get('.generation-player video')
    expect(player.attributes('src')).toBe(completed.videoUrl)
    await player.trigger('loadeddata')
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(10000)
    expect(getProductionGeneration).toHaveBeenCalledTimes(2)
    expect(getProductionGeneration).toHaveBeenLastCalledWith(config.base, 'job-1', 'test-token', expect.any(AbortSignal))
    expect(wrapper.get('.generation-summary').text()).toContain('0:47.25 → 0:50.25')
  })

  it('displays job failure and stops polling', async () => {
    vi.mocked(getProductionGeneration).mockResolvedValue({ jobId: 'job-1', status: 'failed', errorMessage: 'Audio download failed.' })
    mountPage()
    await startVideo()
    await vi.advanceTimersByTimeAsync(15000)
    expect(wrapper.get('.generation-player').text()).toContain('Audio download failed.')
    expect(getProductionGeneration).toHaveBeenCalledTimes(1)
  })

  it('falls back to muted autoplay when the browser blocks audio playback', async () => {
    vi.mocked(getProductionGeneration).mockResolvedValue(completed)
    mountPage()
    await startVideo()
    await vi.advanceTimersByTimeAsync(2500)
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new DOMException('Autoplay blocked', 'NotAllowedError'))
    const player = wrapper.get('.generation-player video')
    await player.trigger('loadeddata')
    await flushPromises()
    expect((player.element as HTMLVideoElement).muted).toBe(true)
    expect(wrapper.text()).toContain('browser blocked audio autoplay')
  })

  it('requires loading an edited track URL before generating', async () => {
    mountPage()
    await useToken()
    await loadTrack()
    expect(wrapper.get('.production-generate').attributes()).not.toHaveProperty('disabled')
    await wrapper.get('input[aria-label="BandLab track URL"]').setValue('https://bandlab.com/track/another-track')
    expect(wrapper.get('.production-generate').attributes()).toHaveProperty('disabled')
    expect(wrapper.get('.pending-track-url').text()).toContain('Load the updated URL')
  })

  it('stops auditioning at the segment end and when the start position changes', async () => {
    mountPage()
    await loadTrack()
    await wrapper.get('input[aria-label="Start (seconds)"]').setValue('47.25')
    const picker = wrapper.findComponent(TrackSegmentPicker)
    await picker.get('button').trigger('click')
    await flushPromises()
    const audio = picker.get('audio')
    expect((audio.element as HTMLAudioElement).currentTime).toBe(47.25)
    expect(picker.get('button').text()).toBe('Stop audio')
    ;(audio.element as HTMLAudioElement).currentTime = 50.25
    await audio.trigger('timeupdate')
    expect(picker.get('button').text()).toBe('Listen to segment')
    await picker.get('button').trigger('click')
    await flushPromises()
    await picker.get('input[type="range"]').setValue('12.5')
    expect(picker.get('button').text()).toBe('Listen to segment')
  })

  it('retries status failures on the same job without creating a second video', async () => {
    vi.mocked(getProductionGeneration).mockRejectedValue(new Error('Network unavailable'))
    mountPage()
    await startVideo()
    await vi.advanceTimersByTimeAsync(10000)
    expect(getProductionGeneration).toHaveBeenCalledTimes(3)
    vi.mocked(getProductionGeneration).mockResolvedValueOnce(completed)
    const retry = wrapper.findAll('button').find(item => item.text() === 'Retry status check')!
    await retry.trigger('click')
    await flushPromises()
    expect(getProductionGeneration).toHaveBeenLastCalledWith(config.base, 'job-1', 'test-token', expect.any(AbortSignal))
    expect(wrapper.get('.generation-player video').attributes('src')).toBe(completed.videoUrl)
    expect(startProductionGeneration).toHaveBeenCalledTimes(1)
  })

  it('stops polling when leaving and starts a fresh session when remounted', async () => {
    mountPage()
    await startVideo()
    wrapper.unmount()
    await vi.advanceTimersByTimeAsync(10000)
    expect(getProductionGeneration).not.toHaveBeenCalled()
    mountPage()
    expect(wrapper.find('.test-dialog').exists()).toBe(false)
    expect(wrapper.find('.production-source').exists()).toBe(false)
    expect((wrapper.get('input[aria-label="BandLab bearer token"]').element as HTMLInputElement).value).toBe('')
    await loadTrack()
    expect(createProductionPreviews).toHaveBeenCalledTimes(1)
    expect(wrapper.get('.production-generate').attributes()).toHaveProperty('disabled')
  })

  it('ignores metadata from a previous track request that resolves late', async () => {
    let resolveOld!: (value: typeof track) => void
    vi.mocked(resolveProductionTrack).mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
    mountPage()
    await useToken()
    await wrapper.get('input[aria-label="BandLab track URL"]').setValue('older-url')
    await wrapper.get('.track-url-form').trigger('submit')
    await loadTrack()
    resolveOld({ ...track, name: 'Old track', pictureUrl: 'old-cover.jpg' })
    await flushPromises()
    expect(wrapper.get('.production-source').text()).toContain(track.name)
    expect(createProductionPreviews).toHaveBeenCalledExactlyOnceWith(config.base, track.pictureUrl, 'test-token', expect.any(AbortSignal))
  })

  it('allows track loading without a token and generates previews only after Use token', async () => {
    mountPage()
    await loadTrack()
    expect(wrapper.get('.production-source').text()).toContain(track.name)
    expect(createProductionPreviews).not.toHaveBeenCalled()
    expect(wrapper.get('.production-generate').attributes()).toHaveProperty('disabled')
    await wrapper.get('input[aria-label="BandLab bearer token"]').setValue(' Bearer test-token ')
    expect(createProductionPreviews).not.toHaveBeenCalled()
    await wrapper.get('.token-form').trigger('submit')
    await flushPromises()
    expect(createProductionPreviews).toHaveBeenCalledExactlyOnceWith(config.base, track.pictureUrl, 'test-token', expect.any(AbortSignal))
    expect(wrapper.get('.production-generate').attributes()).not.toHaveProperty('disabled')
  })

  it('clears the token and ignores a preview response that arrives afterwards', async () => {
    let resolvePreview!: (value: typeof previews) => void
    vi.mocked(createProductionPreviews).mockImplementationOnce(() => new Promise(resolve => { resolvePreview = resolve }))
    mountPage()
    await useToken()
    await loadTrack()
    const signal = vi.mocked(createProductionPreviews).mock.calls[0]![3]!
    await wrapper.findAll('button').find(item => item.text() === 'Clear token')!.trigger('click')
    expect(signal.aborted).toBe(true)
    resolvePreview(previews)
    await flushPromises()
    expect(wrapper.find('.production-preview video').exists()).toBe(false)
    expect(wrapper.get('.production-generate').attributes()).toHaveProperty('disabled')
    expect((wrapper.get('input[aria-label="BandLab bearer token"]').element as HTMLInputElement).value).toBe('')
    await useToken('replacement-token')
    expect(createProductionPreviews).toHaveBeenLastCalledWith(config.base, track.pictureUrl, 'replacement-token', expect.any(AbortSignal))
  })

  it('does not change credentials while a generation is active', async () => {
    mountPage()
    await startVideo()
    expect(wrapper.get('input[aria-label="BandLab bearer token"]').attributes()).toHaveProperty('disabled')
    expect(wrapper.findAll('button').find(item => item.text() === 'Clear token')!.attributes()).toHaveProperty('disabled')
  })
})
