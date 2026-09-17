// @vitest-environment happy-dom
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ProductionTrackVideosView from '@/views/ProductionTrackVideosView.vue'
import TrackSegmentPicker from '@/components/TrackSegmentPicker.vue'
import { PRODUCTION_TRACK_PRESETS } from '@/data/productionTrackPresets'
import { createProductionPreviews, getProductionGeneration, resolveProductionTrack, startProductionGeneration } from '@/services/productionTrackVideo'
import { TRACK_VIDEO_TEMPLATES } from '@/types/productionTrackVideo'

const config = vi.hoisted(() => ({ base: 'https://api.example/api/v1.3' }))
vi.mock('@/services/productionTrackVideo', () => ({
  get TRACK_VIDEO_ENVIRONMENTS() {
    return {
      uat: { label: 'UAT', baseUrl: config.base },
      production: { label: 'Production', baseUrl: 'https://aws.bandlab.com/api/v1.3' },
    }
  },
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
const dialog = defineComponent({ props: ['modelValue'], template: '<div v-if="modelValue" class="test-dialog"><slot /></div>' })
const track = {
  trackUrl: 'https://bandlab.com/track/8398d42e-0504-40c6-b882-bbf42294c641', postId: 'post-id', revisionId: 'revision-id',
  name: 'Blue Ridge Mountains', artistName: 'Artist', pictureUrl: 'https://cdn.example/cover.jpg', audioUrl: 'https://cdn.example/audio.m4a', durationSeconds: 50.25,
}
const previews = TRACK_VIDEO_TEMPLATES.map(template => ({
  templateId: template.id, videoPreviewUrl: `${template.id}.mp4`, picture: { url: `${template.id}.jpg`, isDefault: false },
}))
const completed = { jobId: 'job-1', status: 'completed' as const, templateId: 'sound-wave' as const, videoUrl: 'https://cdn.example/result.mp4' }
let wrapper: ReturnType<typeof mount>

function mountPage() {
  wrapper = mount(ProductionTrackVideosView, { global: { stubs: {
    VContainer: container, VCard: container, VBtn: button, VTextField: input,
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
  await vi.advanceTimersByTimeAsync(300)
  await flushPromises()
}

async function startVideo(token = 'test-token') {
  await useToken(token)
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
  it('defaults to UAT, routes previews and generation to Production, and clears the result when switching back', async () => {
    vi.mocked(getProductionGeneration).mockResolvedValue(completed)
    mountPage()
    expect(wrapper.get('[data-environment="uat"]').attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('.production-heading').text()).toContain('UAT environment')
    await wrapper.get('[data-environment="production"]').trigger('click')
    expect(wrapper.get('.production-heading').text()).toContain('Production environment')
    expect(wrapper.get('.api-endpoint').text()).toBe('https://aws.bandlab.com/api/v1.3/track-videos')
    expect(wrapper.get('.production-notice').text()).toContain('live service')
    expect(wrapper.get('.token-note').text()).toContain('Use a Production BandLab token')
    expect(createProductionPreviews).not.toHaveBeenCalled()
    await startVideo('production-token')
    expect(createProductionPreviews).toHaveBeenCalledExactlyOnceWith('https://aws.bandlab.com/api/v1.3', track.pictureUrl, 'production-token', expect.any(AbortSignal))
    expect(startProductionGeneration).toHaveBeenCalledExactlyOnceWith('https://aws.bandlab.com/api/v1.3', {
      trackCoverUrl: track.pictureUrl, trackAudioUrl: track.audioUrl, templateId: 'sound-wave', startTimeSeconds: 47.25,
    }, 'production-token', expect.any(AbortSignal))
    await vi.advanceTimersByTimeAsync(2500)
    expect(getProductionGeneration).toHaveBeenCalledExactlyOnceWith('https://aws.bandlab.com/api/v1.3', 'job-1', 'production-token', expect.any(AbortSignal))
    expect(wrapper.get('.generation-summary').text()).toContain('Production')
    await wrapper.get('[aria-label="Close generated video"]').trigger('click')
    await wrapper.get('[data-environment="uat"]').trigger('click')
    expect(wrapper.get('.api-endpoint').text()).toBe(`${config.base}/track-videos`)
    expect(wrapper.find('.production-notice').exists()).toBe(false)
    expect(wrapper.find('.last-result').exists()).toBe(false)
    expect(wrapper.find('.production-source').exists()).toBe(false)
    expect(wrapper.find('.production-preview video').exists()).toBe(false)
    expect(wrapper.find('.generation-timings').exists()).toBe(false)
    expect((wrapper.get('input[aria-label="BandLab bearer token"]').element as HTMLInputElement).value).toBe('')
    expect((wrapper.get('input[aria-label="BandLab track URL"]').element as HTMLInputElement).value).toBe('')
    expect(wrapper.get('.production-generate').attributes()).toHaveProperty('disabled')
    await vi.advanceTimersByTimeAsync(10000)
    expect(getProductionGeneration).toHaveBeenCalledTimes(1)
  })

  it('aborts old-environment previews and never reuses its token in the new environment', async () => {
    let resolveOld!: (value: typeof previews) => void
    vi.mocked(createProductionPreviews).mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
    mountPage()
    await useToken('uat-token')
    await loadTrack()
    const signal = vi.mocked(createProductionPreviews).mock.calls[0]![3]!
    await wrapper.get('[data-environment="production"]').trigger('click')
    expect(signal.aborted).toBe(true)
    resolveOld(previews)
    await flushPromises()
    expect(wrapper.find('.production-preview video').exists()).toBe(false)
    expect(wrapper.find('.preview-timing').exists()).toBe(false)
    await loadTrack()
    expect(createProductionPreviews).toHaveBeenCalledTimes(1)
    expect(wrapper.get('.production-generate').attributes()).toHaveProperty('disabled')
    await useToken('production-token')
    expect(createProductionPreviews).toHaveBeenLastCalledWith('https://aws.bandlab.com/api/v1.3', track.pictureUrl, 'production-token', expect.any(AbortSignal))
    expect(createProductionPreviews).toHaveBeenCalledTimes(2)
  })

  it('ignores metadata arriving after an environment switch, even with a new token set', async () => {
    let resolveOld!: (value: typeof track) => void
    vi.mocked(resolveProductionTrack).mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
    mountPage()
    await useToken('uat-token')
    await loadTrack()
    const signal = vi.mocked(resolveProductionTrack).mock.calls[0]![1]!
    await wrapper.get('[data-environment="production"]').trigger('click')
    expect(signal.aborted).toBe(true)
    await useToken('production-token')
    resolveOld(track)
    await flushPromises()
    expect(wrapper.find('.production-source').exists()).toBe(false)
    expect(wrapper.find('.track-loading').exists()).toBe(false)
    expect(createProductionPreviews).not.toHaveBeenCalled()
  })

  it('loads a named preset immediately and allows switching to a custom track URL', async () => {
    mountPage()
    await useToken()
    const preset = PRODUCTION_TRACK_PRESETS[0]
    const options = wrapper.findAll('.track-preset')
    expect(options).toHaveLength(PRODUCTION_TRACK_PRESETS.length)
    expect(options[0]!.text()).toBe(preset.name)
    await options[0]!.trigger('click')
    await flushPromises()
    const urlInput = wrapper.get('input[aria-label="BandLab track URL"]')
    expect((urlInput.element as HTMLInputElement).value).toBe(preset.url)
    expect(options[0]!.attributes('aria-pressed')).toBe('true')
    expect(resolveProductionTrack).toHaveBeenCalledExactlyOnceWith(preset.url, expect.any(AbortSignal))
    expect(createProductionPreviews).toHaveBeenCalledTimes(1)
    await urlInput.setValue(track.trackUrl)
    expect(options[0]!.attributes('aria-pressed')).toBe('false')
    expect(resolveProductionTrack).toHaveBeenCalledTimes(1)
    expect(wrapper.get('.production-generate').attributes()).toHaveProperty('disabled')
    await wrapper.get('.track-url-form').trigger('submit')
    await flushPromises()
    expect(resolveProductionTrack).toHaveBeenLastCalledWith(track.trackUrl, expect.any(AbortSignal))
    expect(createProductionPreviews).toHaveBeenCalledTimes(2)
    expect(wrapper.get('.production-generate').attributes()).not.toHaveProperty('disabled')
  })

  it('clearly labels the 15-second segment and updates the highlighted window and shorter ending', async () => {
    mountPage()
    await loadTrack()
    const picker = wrapper.findComponent(TrackSegmentPicker)
    expect(picker.get('h2').text()).toBe('Choose a 15-second segment')
    expect(picker.get('.segment-duration').text()).toBe('15 seconds selected')
    expect(picker.find('.segment-short-note').exists()).toBe(false)
    const slider = picker.get<HTMLInputElement>('.segment-slider')
    expect(slider.attributes('aria-valuetext')).toBe('0:00.00 to 0:15.00, 15 seconds')
    expect(slider.element.style.getPropertyValue('--segment-start')).toBe('0%')
    expect(parseFloat(slider.element.style.getPropertyValue('--segment-end'))).toBeCloseTo(15 / 50.25 * 100)
    await wrapper.get('input[aria-label="Start (seconds)"]').setValue('47.25')
    expect(picker.get('.segment-duration').text()).toBe('3 seconds selected')
    expect(picker.get('.segment-short-note').text()).toContain('Only 3 seconds remain')
    expect(slider.attributes('aria-valuetext')).toBe('0:47.25 to 0:50.25, 3 seconds')
    expect(slider.element.style.getPropertyValue('--segment-end')).toBe('100%')
    expect(parseFloat(slider.element.style.getPropertyValue('--segment-start'))).toBeCloseTo(47.25 / 50.25 * 100)
    await wrapper.get('input[aria-label="Start (seconds)"]').setValue('')
    expect(picker.find('.segment-duration').exists()).toBe(false)
    expect(picker.find('.segment-short-note').exists()).toBe(false)
    expect(picker.get('.segment-window').text()).toContain('Enter a valid start time')
  })

  it('shows the actual segment duration for a track shorter than 15 seconds', async () => {
    vi.mocked(resolveProductionTrack).mockResolvedValueOnce({ ...track, durationSeconds: 8.5 })
    mountPage()
    await loadTrack()
    expect(wrapper.get('.segment-duration').text()).toBe('8.50 seconds selected')
    expect(wrapper.get('.segment-short-note').text()).toContain('Only 8.50 seconds remain')
    expect(wrapper.get('.segment-window').text()).toBe('0:00.00 → 0:08.50')
  })

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

  it('measures the whole preview batch in seconds and replaces its timing on refresh', async () => {
    vi.mocked(createProductionPreviews).mockImplementationOnce(() => new Promise(resolve => {
      setTimeout(() => resolve(previews), 1250)
    }))
    mountPage()
    await useToken()
    await loadTrack()
    expect(wrapper.find('.preview-timing').exists()).toBe(false)
    await vi.advanceTimersByTimeAsync(1250)
    expect(wrapper.get('.preview-timing').text()).toBe('Five previews: 1.25 seconds')
    await wrapper.findAll('.production-template-option')[1]!.trigger('click')
    await vi.advanceTimersByTimeAsync(10000)
    expect(wrapper.get('.preview-timing').text()).toBe('Five previews: 1.25 seconds')

    vi.mocked(createProductionPreviews).mockImplementationOnce(() => new Promise(resolve => {
      setTimeout(() => resolve(previews), 350)
    }))
    await wrapper.get('.template-heading button').trigger('click')
    expect(wrapper.find('.preview-timing').exists()).toBe(false)
    await vi.advanceTimersByTimeAsync(350)
    expect(wrapper.get('.preview-timing').text()).toBe('Five previews: 0.35 seconds')

    vi.mocked(createProductionPreviews).mockRejectedValueOnce(new Error('Preview rendering failed'))
    await wrapper.get('.template-heading button').trigger('click')
    await flushPromises()
    expect(wrapper.find('.preview-timing').exists()).toBe(false)
    expect(wrapper.text()).toContain('Preview rendering failed')
  })

  it('retains both timings after generation and reopening, includes submission latency, and times a fresh run separately', async () => {
    vi.mocked(createProductionPreviews).mockImplementationOnce(() => new Promise(resolve => {
      setTimeout(() => resolve(previews), 1250)
    }))
    vi.mocked(startProductionGeneration).mockImplementationOnce(() => new Promise(resolve => {
      setTimeout(() => resolve({ jobId: 'job-1', status: 'queued' }), 800)
    }))
    vi.mocked(getProductionGeneration).mockImplementationOnce(() => new Promise(resolve => {
      setTimeout(() => resolve(completed), 600)
    }))
    mountPage()
    await useToken()
    await loadTrack()
    await vi.advanceTimersByTimeAsync(1250)
    await wrapper.get('.production-generate').trigger('click')
    expect(wrapper.find('.video-timing').exists()).toBe(false)
    await vi.advanceTimersByTimeAsync(3900)
    expect(wrapper.get('.preview-timing').text()).toBe('Five previews: 1.25 seconds')
    expect(wrapper.get('.video-timing').text()).toBe('Video generation: 3.90 seconds')
    expect(wrapper.get('.completed-generation-timing').text()).toContain('3.90 seconds')
    await wrapper.get('[aria-label="Close generated video"]').trigger('click')
    await wrapper.findAll('.production-template-option')[1]!.trigger('click')
    await vi.advanceTimersByTimeAsync(10000)
    expect(wrapper.get('.video-timing').text()).toBe('Video generation: 3.90 seconds')
    await wrapper.get('.last-result').trigger('click')
    expect(wrapper.get('.completed-generation-timing').text()).toContain('3.90 seconds')
    await wrapper.get('[aria-label="Close generated video"]').trigger('click')

    vi.mocked(getProductionGeneration).mockResolvedValue(completed)
    await wrapper.get('.production-generate').trigger('click')
    expect(wrapper.find('.video-timing').exists()).toBe(false)
    expect(wrapper.find('.completed-generation-timing').exists()).toBe(false)
    expect(wrapper.get('.preview-timing').text()).toBe('Five previews: 1.25 seconds')
    await vi.advanceTimersByTimeAsync(2500)
    expect(wrapper.get('.video-timing').text()).toBe('Video generation: 2.50 seconds')
    await wrapper.get('[aria-label="Close generated video"]').trigger('click')

    let resolveNew!: (value: typeof track) => void
    vi.mocked(resolveProductionTrack).mockImplementationOnce(() => new Promise(resolve => { resolveNew = resolve }))
    await loadTrack()
    expect(wrapper.find('.generation-timings').exists()).toBe(false)
    resolveNew(track)
    await flushPromises()
  })

  it('does not report a completed generation time after stopping or a late completion', async () => {
    let finishJob!: (value: typeof completed) => void
    vi.mocked(getProductionGeneration).mockImplementationOnce(() => new Promise(resolve => { finishJob = resolve }))
    mountPage()
    await startVideo()
    await vi.advanceTimersByTimeAsync(2500)
    await wrapper.findAll('button').find(item => item.text() === 'Stop waiting')!.trigger('click')
    finishJob(completed)
    await flushPromises()
    expect(wrapper.find('.video-timing').exists()).toBe(false)
    expect(wrapper.find('.test-dialog').exists()).toBe(false)
    expect(wrapper.find('.preview-timing').exists()).toBe(true)
  })

  it('displays the nested job failure and stops polling', async () => {
    vi.mocked(getProductionGeneration).mockResolvedValue({ jobId: 'job-1', status: 'failed', error: { message: 'Audio download failed.' } })
    mountPage()
    await startVideo()
    await vi.advanceTimersByTimeAsync(15000)
    expect(wrapper.get('.generation-player').text()).toContain('Audio download failed.')
    expect(wrapper.get('.generation-heading h2').text()).toBe('Generation failed')
    expect(getProductionGeneration).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.video-timing').exists()).toBe(false)
    expect(wrapper.find('.completed-generation-timing').exists()).toBe(false)
  })

  it('shows all five picture thumbnails and switches the selected preview by template ID', async () => {
    vi.mocked(createProductionPreviews).mockResolvedValueOnce([...previews].reverse())
    mountPage()
    await useToken()
    await loadTrack()

    const options = wrapper.findAll('.production-template-option')
    expect(options).toHaveLength(5)
    for (const [index, preview] of previews.entries()) {
      const option = options[index]!
      expect(option.get('img').attributes('src')).toBe(preview.picture.url)
      await option.trigger('click')
      const player = wrapper.get('.production-preview video')
      expect(player.attributes('src')).toBe(preview.videoPreviewUrl)
      expect(player.attributes('poster')).toBe(preview.picture.url)
      expect(option.attributes('aria-pressed')).toBe('true')
    }
    expect(createProductionPreviews).toHaveBeenCalledTimes(1)
    expect(getProductionGeneration).not.toHaveBeenCalled()
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
    expect(wrapper.get('.video-timing').text()).toBe('Video generation: 10.00 seconds')
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
    expect(wrapper.find('.generation-timings').exists()).toBe(false)
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

  it('automatically applies a pasted token and generates previews for the loaded track', async () => {
    mountPage()
    await loadTrack()
    expect(wrapper.get('.production-source').text()).toContain(track.name)
    expect(createProductionPreviews).not.toHaveBeenCalled()
    expect(wrapper.get('.production-generate').attributes()).toHaveProperty('disabled')
    await wrapper.get('input[aria-label="BandLab bearer token"]').setValue(' Bearer test-token ')
    expect(createProductionPreviews).not.toHaveBeenCalled()
    expect(wrapper.findAll('button').some(item => item.text() === 'Use token')).toBe(false)
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()
    expect(createProductionPreviews).toHaveBeenCalledExactlyOnceWith(config.base, track.pictureUrl, 'test-token', expect.any(AbortSignal))
    expect(wrapper.get('.production-generate').attributes()).not.toHaveProperty('disabled')
  })

  it('waits for token edits to settle and disables generation with the previous token immediately', async () => {
    mountPage()
    await loadTrack()
    await useToken('old-token')
    vi.mocked(createProductionPreviews).mockClear()
    const input = wrapper.get('input[aria-label="BandLab bearer token"]')
    await input.setValue('new')
    expect(wrapper.get('.production-generate').attributes()).toHaveProperty('disabled')
    await vi.advanceTimersByTimeAsync(200)
    await input.setValue('new-token')
    await vi.advanceTimersByTimeAsync(299)
    expect(createProductionPreviews).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(createProductionPreviews).toHaveBeenCalledExactlyOnceWith(config.base, track.pictureUrl, 'new-token', expect.any(AbortSignal))
    await input.setValue(' Bearer new-token ')
    await vi.advanceTimersByTimeAsync(500)
    expect(createProductionPreviews).toHaveBeenCalledTimes(1)
  })

  it.each(['', ' ', 'Bearer '])('cancels pending token application when the field is cleared: %j', async value => {
    mountPage()
    await loadTrack()
    const input = wrapper.get('input[aria-label="BandLab bearer token"]')
    await input.setValue('pending-token')
    await input.setValue(value)
    await vi.advanceTimersByTimeAsync(500)
    expect(createProductionPreviews).not.toHaveBeenCalled()
    expect(wrapper.get('.production-generate').attributes()).toHaveProperty('disabled')
  })

  it('cancels pending token application when switching environments or leaving the page', async () => {
    mountPage()
    await loadTrack()
    await wrapper.get('input[aria-label="BandLab bearer token"]').setValue('uat-token')
    await wrapper.get('[data-environment="production"]').trigger('click')
    await vi.advanceTimersByTimeAsync(500)
    await loadTrack()
    expect(createProductionPreviews).not.toHaveBeenCalled()
    expect(wrapper.get('.production-generate').attributes()).toHaveProperty('disabled')
    await wrapper.get('input[aria-label="BandLab bearer token"]').setValue('production-token')
    wrapper.unmount()
    await vi.advanceTimersByTimeAsync(500)
    expect(createProductionPreviews).not.toHaveBeenCalled()
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
    expect(wrapper.find('.preview-timing').exists()).toBe(false)
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
    expect(wrapper.get('.track-preset').attributes()).toHaveProperty('disabled')
    expect(wrapper.get('[data-environment="production"]').attributes()).toHaveProperty('disabled')
    await wrapper.get('[data-environment="production"]').trigger('click')
    expect(wrapper.get('[data-environment="uat"]').attributes('aria-pressed')).toBe('true')
  })
})
