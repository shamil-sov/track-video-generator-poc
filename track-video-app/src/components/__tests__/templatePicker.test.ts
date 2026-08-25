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
      },
      global: {
        stubs: {
          VIcon: passthroughStub,
        },
      },
    })

    expect(wrapper.find('.selected-template').text()).toContain('Vinyl')
    expect(wrapper.findAll('.template-card')).toHaveLength(6)

    const vinylSleeve = wrapper.findAll('.template-card')
      .find(card => card.text().includes('Vinyl Sleeve'))
    expect(vinylSleeve).toBeDefined()
    await vinylSleeve!.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['vinyl-sleeve'])

    await wrapper.setProps({ modelValue: 'vinyl-sleeve' })
    expect(wrapper.find('.selected-template').text()).toContain('Vinyl Sleeve')
  })
})
