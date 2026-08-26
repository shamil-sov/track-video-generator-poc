// @vitest-environment happy-dom

import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import TemplatePicker from '@/components/TemplatePicker.vue'

const passthroughStub = defineComponent({
  template: '<span><slot /></span>',
})

describe('TemplatePicker', () => {
  it('shows the selected template in a large preview and keeps compact choices below', async () => {
    const wrapper = mount(TemplatePicker, {
      props: {
        modelValue: 'vinyl-orbit',
        templates: [
          {
            id: 'vinyl-orbit',
            name: 'Vinyl Launch',
            exampleVideoUrls: ['vinyl-1.mp4', 'vinyl-2.mp4', 'vinyl-3.mp4', 'vinyl-4.mp4'],
          },
          {
            id: 'vinyl-sleeve',
            name: 'Vinyl Sleeve',
            exampleVideoUrls: ['sleeve-1.mp4', 'sleeve-2.mp4', 'sleeve-3.mp4', 'sleeve-4.mp4'],
          },
        ],
      },
      global: {
        stubs: {
          VIcon: passthroughStub,
        },
      },
    })

    expect(wrapper.find('.selected-template').text()).toContain('Vinyl Launch')
    expect(wrapper.find('.selected-template__video').attributes('src')).toBe('vinyl-1.mp4')
    expect((wrapper.find('.selected-template__video').element as HTMLVideoElement).muted).toBe(false)
    expect(wrapper.find('.carousel-peek--previous video').attributes('src')).toBe('vinyl-4.mp4')
    expect(wrapper.find('.carousel-peek--next video').attributes('src')).toBe('vinyl-2.mp4')
    expect(wrapper.findAll('.template-card')).toHaveLength(2)
    expect(wrapper.find('.template-preview').attributes('autoplay')).toBeUndefined()
    expect((wrapper.find('.template-preview').element as HTMLVideoElement).muted).toBe(false)

    await wrapper.findAll('.carousel-arrow')[1].trigger('click')
    expect(wrapper.find('.selected-template__video').attributes('src')).toBe('vinyl-2.mp4')

    await wrapper.findAll('.carousel-arrow')[0].trigger('click')
    expect(wrapper.find('.selected-template__video').attributes('src')).toBe('vinyl-1.mp4')

    await wrapper.find('.sound-toggle').trigger('click')
    expect(wrapper.find('.sound-toggle').text()).toContain('Sound off')
    expect((wrapper.find('.selected-template__video').element as HTMLVideoElement).muted).toBe(true)

    const vinylSleeve = wrapper.findAll('.template-card')
      .find(card => card.text().includes('Vinyl Sleeve'))
    expect(vinylSleeve).toBeDefined()
    await vinylSleeve!.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['vinyl-sleeve'])

    await wrapper.setProps({ modelValue: 'vinyl-sleeve' })
    expect(wrapper.find('.selected-template').text()).toContain('Vinyl Sleeve')
    expect(wrapper.find('.selected-template__video').attributes('src')).toBe('sleeve-1.mp4')
  })
})
