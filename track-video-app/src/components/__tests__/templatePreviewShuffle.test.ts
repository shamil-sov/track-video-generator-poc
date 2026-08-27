// @vitest-environment happy-dom

import { defineComponent } from 'vue'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AiVideoTemplatePicker from '@/components/AiVideoTemplatePicker.vue'
import TemplatePicker from '@/components/TemplatePicker.vue'

const templates = ['first', 'second'].map(id => ({
  id,
  name: id,
  description: 'Preview examples',
  exampleVideoUrl: `${id}-canonical.mp4`,
  exampleVideoUrls: [1, 2, 3, 4].map(index => `${id}-${index}.mp4`),
}))
const iconStub = defineComponent({ template: '<span></span>' })

enableAutoUnmount(afterEach)

describe.each([
  { name: 'Cover', component: TemplatePicker },
  { name: 'AI-image', component: AiVideoTemplatePicker },
])('$name template preview shuffling', ({ component }) => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  })

  afterEach(() => vi.restoreAllMocks())

  function mountPicker(items = templates) {
    return mount(component, {
      props: { templates: items, modelValue: items[0].id },
      global: { stubs: { VIcon: iconStub } },
    })
  }

  it('shuffles all previews once, keeps navigation stable, and leaves the catalogue unchanged', async () => {
    const original = structuredClone(templates)
    const wrapper = mountPicker()
    const source = () => wrapper.get('.selected-template__video').attributes('src')

    expect(source()).toBe('first-2.mp4')
    expect(wrapper.get('.carousel-peek--previous video').attributes('src')).toBe('first-1.mp4')
    expect(wrapper.get('.carousel-peek--next video').attributes('src')).toBe('first-3.mp4')
    const shuffleCalls = vi.mocked(Math.random).mock.calls.length

    for (const expected of ['first-3.mp4', 'first-4.mp4', 'first-1.mp4', 'first-2.mp4']) {
      await wrapper.get('[aria-label="Show next preview"]').trigger('click')
      expect(source()).toBe(expected)
    }
    await wrapper.get('[aria-label="Show previous preview"]').trigger('click')
    expect(source()).toBe('first-1.mp4')
    await wrapper.get('.sound-toggle').trigger('click')
    expect(vi.mocked(Math.random).mock.calls).toHaveLength(shuffleCalls)
    expect(templates).toEqual(original)
    expect(wrapper.findAll('.template-preview').map(video => video.attributes('src'))).toEqual([
      'first-1.mp4', 'second-1.mp4',
    ])
  })

  it('reshuffles on a repeated click, keeps the sound setting, and stops the previous player', async () => {
    const wrapper = mountPicker()
    await flushPromises()
    const previousVideo = wrapper.get('.selected-template__video').element as HTMLVideoElement
    expect(previousVideo.muted).toBe(true)
    expect(previousVideo.src).toContain('first-2.mp4')
    await wrapper.get('.sound-toggle').trigger('click')

    await wrapper.findAll('.template-card')[0].trigger('click')
    await flushPromises()
    const nextVideo = wrapper.get('.selected-template__video').element as HTMLVideoElement
    expect(nextVideo.src).toContain('first-3.mp4')
    expect(nextVideo.muted).toBe(false)
    expect(nextVideo.controls).toBe(true)
    expect(vi.mocked(HTMLMediaElement.prototype.pause).mock.contexts).toContain(previousVideo)
    expect(vi.mocked(HTMLMediaElement.prototype.play).mock.contexts.at(-1)).toBe(nextVideo)

    for (const preview of wrapper.findAll('.template-preview, .carousel-peek video')) {
      const video = preview.element as HTMLVideoElement
      expect(video.autoplay).toBe(false)
      expect(video.muted).toBe(true)
      expect(vi.mocked(HTMLMediaElement.prototype.play).mock.contexts).not.toContain(video)
    }
  })

  it('avoids repeating the currently viewed example after manual navigation', async () => {
    const wrapper = mountPicker()
    await wrapper.get('[aria-label="Show next preview"]').trigger('click')
    expect(wrapper.get('.selected-template__video').attributes('src')).toBe('first-3.mp4')

    await wrapper.findAll('.template-card')[0].trigger('click')
    expect(wrapper.get('.selected-template__video').attributes('src')).toBe('first-2.mp4')
    await wrapper.findAll('.template-card')[0].trigger('click')
    expect(wrapper.get('.selected-template__video').attributes('src')).toBe('first-3.mp4')
  })

  it('reshuffles when returning to a template and still emits its original ID', async () => {
    const wrapper = mountPicker()
    expect(wrapper.get('.selected-template__video').attributes('src')).toBe('first-2.mp4')

    await wrapper.findAll('.template-card')[1].trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['second'])
    await wrapper.setProps({ modelValue: 'second' })
    expect(wrapper.get('.selected-template__video').attributes('src')).toBe('second-2.mp4')

    await wrapper.findAll('.template-card')[0].trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['first'])
    await wrapper.setProps({ modelValue: 'first' })
    expect(wrapper.get('.selected-template__video').attributes('src')).toBe('first-3.mp4')
  })

  it('keeps single-preview templates usable when selected again', async () => {
    const wrapper = mountPicker([{ ...templates[0], exampleVideoUrls: ['only.mp4'] }])
    await wrapper.find('.template-card').trigger('click')

    expect(wrapper.get('.selected-template__video').attributes('src')).toBe('only.mp4')
    expect(wrapper.findAll('.carousel-arrow, .carousel-peek')).toHaveLength(0)
  })
})
