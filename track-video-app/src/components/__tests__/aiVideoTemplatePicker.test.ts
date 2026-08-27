// @vitest-environment happy-dom

import { defineComponent } from 'vue'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AiVideoTemplatePicker from '@/components/AiVideoTemplatePicker.vue'
import type { AiImageVideoTemplate } from '@/types/aiImageTrackVideo'

const templates: AiImageVideoTemplate[] = [
  {
    id: 'vinyl-orbit',
    name: 'Vinyl Launch',
    description: 'A record emerges from the generated artwork.',
    exampleVideoUrl: 'vinyl-canonical.mp4',
    exampleVideoUrls: ['vinyl-1.mp4', 'vinyl-2.mp4', 'vinyl-3.mp4', 'vinyl-4.mp4'],
  },
  {
    id: 'orbit',
    name: 'Sonic Halo',
    description: 'Spectrum arcs orbit the generated artwork.',
    exampleVideoUrl: 'orbit-canonical.mp4',
    exampleVideoUrls: ['orbit-1.mp4', 'orbit-2.mp4', 'orbit-3.mp4', 'orbit-4.mp4'],
  },
]

function mountPicker(items = templates) {
  return mount(AiVideoTemplatePicker, {
    props: {
      templates: items,
      modelValue: items[0].id,
    },
    global: {
      stubs: {
        VIcon: defineComponent({ template: '<span></span>' }),
      },
    },
  })
}

enableAutoUnmount(afterEach)

describe('AI-image video template previews', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999)
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  })

  afterEach(() => vi.restoreAllMocks())

  it('prefers all four gallery previews, with looping navigation outside the central player', async () => {
    const wrapper = mountPicker()
    const centralSource = () => wrapper.get('.selected-template__video').attributes('src')

    expect(centralSource()).toBe('vinyl-1.mp4')
    expect(wrapper.get('.selected-template').text()).toContain(templates[0].description)
    expect(wrapper.get('.carousel-peek--previous video').attributes('src')).toBe('vinyl-4.mp4')
    expect(wrapper.get('.carousel-peek--next video').attributes('src')).toBe('vinyl-2.mp4')
    expect(wrapper.findAll('.selected-template__media button')).toHaveLength(0)
    expect(wrapper.findAll('.carousel-arrow')).toHaveLength(2)
    expect(wrapper.get('.template-preview').attributes('src')).toBe('vinyl-1.mp4')

    for (const expected of ['vinyl-2.mp4', 'vinyl-3.mp4', 'vinyl-4.mp4', 'vinyl-1.mp4']) {
      await wrapper.get('[aria-label="Show next preview"]').trigger('click')
      expect(centralSource()).toBe(expected)
    }
    await wrapper.get('[aria-label="Show previous preview"]').trigger('click')
    expect(centralSource()).toBe('vinyl-4.mp4')
    await wrapper.get('[aria-label="Select next preview"]').trigger('click')
    expect(centralSource()).toBe('vinyl-1.mp4')
    await wrapper.get('[aria-label="Select previous preview"]').trigger('click')
    expect(centralSource()).toBe('vinyl-4.mp4')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it.each([undefined, []])('uses the canonical preview when exampleVideoUrls is %s', exampleVideoUrls => {
    const wrapper = mountPicker([{ ...templates[0], exampleVideoUrls }])

    expect(wrapper.get('.selected-template__video').attributes('src')).toBe('vinyl-canonical.mp4')
    expect(wrapper.get('.template-preview').attributes('src')).toBe('vinyl-canonical.mp4')
    expect(wrapper.find('.preview-carousel--single').exists()).toBe(true)
    expect(wrapper.findAll('.carousel-arrow, .carousel-peek')).toHaveLength(0)
    expect((wrapper.get('video').element as HTMLVideoElement).controls).toBe(true)
  })

  it('resets the preview on template selection and emits the unchanged template ID', async () => {
    const wrapper = mountPicker()
    await wrapper.get('[aria-label="Show next preview"]').trigger('click')
    await wrapper.get('[aria-label="Show next preview"]').trigger('click')
    expect(wrapper.get('.selected-template__video').attributes('src')).toBe('vinyl-3.mp4')

    await wrapper.findAll('.template-card')[1].trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['orbit'])
    await wrapper.setProps({ modelValue: 'orbit' })
    expect(wrapper.get('.selected-template__video').attributes('src')).toBe('orbit-1.mp4')
    expect(wrapper.get('[aria-checked="true"]').text()).toContain('Sonic Halo')

    await wrapper.setProps({ modelValue: 'vinyl-orbit' })
    expect(wrapper.get('.selected-template__video').attributes('src')).toBe('vinyl-1.mp4')
  })

  it('only plays the central video, supports mute controls, and stops the previous player', async () => {
    const wrapper = mountPicker()
    await flushPromises()
    const firstVideo = wrapper.get('.selected-template__video').element as HTMLVideoElement
    expect(firstVideo.muted).toBe(true)
    expect(wrapper.get('.sound-toggle').text()).toContain('Sound off')
    expect(firstVideo.controls).toBe(true)
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled()

    for (const card of wrapper.findAll('.template-card')) {
      await card.trigger('mouseenter')
      await card.trigger('focus')
    }
    for (const preview of wrapper.findAll('.template-preview, .carousel-peek video')) {
      const video = preview.element as HTMLVideoElement
      expect(video.autoplay).toBe(false)
      expect(video.controls).toBe(false)
      expect(video.paused).toBe(true)
      expect(video.muted).toBe(true)
    }
    expect(vi.mocked(HTMLMediaElement.prototype.play).mock.contexts.every(video => (
      video === firstVideo
    ))).toBe(true)

    await wrapper.get('.sound-toggle').trigger('click')
    expect(firstVideo.muted).toBe(false)
    expect(wrapper.get('.sound-toggle').attributes('aria-pressed')).toBe('false')

    await wrapper.get('[aria-label="Show next preview"]').trigger('click')
    await flushPromises()
    expect(vi.mocked(HTMLMediaElement.prototype.pause).mock.contexts).toContain(firstVideo)
    const nextVideo = wrapper.get('.selected-template__video').element as HTMLVideoElement
    expect(nextVideo.muted).toBe(false)
    expect(vi.mocked(HTMLMediaElement.prototype.play).mock.contexts.at(-1)).toBe(nextVideo)

    nextVideo.muted = true
    await wrapper.get('.selected-template__video').trigger('volumechange')
    expect(wrapper.get('.sound-toggle').text()).toContain('Sound off')
    expect(wrapper.get('.sound-toggle').attributes('aria-pressed')).toBe('true')

    wrapper.unmount()
    expect(vi.mocked(HTMLMediaElement.prototype.pause).mock.contexts).toContain(nextVideo)
  })

  it('leaves playback controls available when the browser blocks playback after enabling sound', async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValue(
      new DOMException('User interaction is required', 'NotAllowedError'),
    )
    const wrapper = mountPicker()
    await flushPromises()
    await wrapper.get('.sound-toggle').trigger('click')
    await flushPromises()

    const video = wrapper.get('.selected-template__video').element as HTMLVideoElement
    expect(video.controls).toBe(true)
    expect(video.muted).toBe(false)
    expect(wrapper.find('.template-video-placeholder').exists()).toBe(false)
  })

  it('keeps other previews and template choices usable when one preview fails', async () => {
    const wrapper = mountPicker()
    await wrapper.get('.selected-template__video').trigger('error')
    expect(wrapper.get('.selected-template').text()).toContain('Preview unavailable')
    expect(wrapper.findAll('.template-card')).toHaveLength(2)

    await wrapper.get('[aria-label="Show next preview"]').trigger('click')
    expect(wrapper.get('.selected-template__video').attributes('src')).toBe('vinyl-2.mp4')
    await wrapper.get('[aria-label="Show previous preview"]').trigger('click')
    expect(wrapper.get('.selected-template').text()).toContain('Preview unavailable')
    await wrapper.setProps({ modelValue: 'orbit' })
    expect(wrapper.get('.selected-template__video').attributes('src')).toBe('orbit-1.mp4')
  })
})
