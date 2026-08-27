// @vitest-environment happy-dom

import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import StylePromptInput from '@/components/StylePromptInput.vue'

const example = 'Album cover art for {trackGenre} track titled "{trackName}". '
  + 'Woodblock linocut style, earthy green and rust tones, tactile texture, '
  + 'moody minimalism, includes text "{trackName}".'

describe('StylePromptInput', () => {
  it('highlights every supported placeholder without changing the prompt', () => {
    const wrapper = mount(StylePromptInput, { props: { modelValue: example } })

    expect(wrapper.findAll('.prompt-input__token').map(token => token.text())).toEqual([
      '{trackGenre}', '{trackName}', '{trackName}',
    ])
    expect(wrapper.find('textarea').element.value).toBe(example)
    expect(wrapper.find('.prompt-input__highlights').element.textContent).toBe(`${example}\u200b`)
    expect(wrapper.find('.prompt-input__counter').text()).toBe(`${example.length} / 2000`)
    expect(wrapper.find('.prompt-input__highlights').attributes('aria-hidden')).toBe('true')
  })

  it('updates highlights during editing and when a prompt preset is selected', async () => {
    const wrapper = mount(StylePromptInput, { props: { modelValue: '{trackNam' } })
    expect(wrapper.findAll('.prompt-input__token')).toHaveLength(0)

    await wrapper.find('textarea').setValue('{trackName}')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['{trackName}'])
    await wrapper.setProps({ modelValue: '{trackName}' })
    expect(wrapper.find('.prompt-input__token').text()).toBe('{trackName}')

    await wrapper.setProps({ modelValue: example })
    expect(wrapper.findAll('.prompt-input__token')).toHaveLength(3)

    await wrapper.setProps({ modelValue: '' })
    expect(wrapper.findAll('.prompt-input__token')).toHaveLength(0)
    expect(wrapper.find('textarea').element.value).toBe('')
  })

  it('preserves multiline text and treats HTML and unknown placeholders as plain text', () => {
    const prompt = '<img src=x onerror=alert(1)>\n\t{trackGenre} {other} {TrackName}\n'
    const wrapper = mount(StylePromptInput, { props: { modelValue: prompt } })

    expect(wrapper.findAll('.prompt-input__token').map(token => token.text())).toEqual(['{trackGenre}'])
    expect(wrapper.find('.prompt-input__highlights').element.textContent).toBe(`${prompt}\u200b`)
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('textarea').element.value).toBe(prompt)
  })

  it('retains native selection, labelling, validation, and disabled behavior', async () => {
    const wrapper = mount(StylePromptInput, { props: { modelValue: example } })
    const textarea = wrapper.find('textarea')
    const start = example.indexOf('{trackGenre}')
    textarea.element.setSelectionRange(start, start + '{trackGenre}'.length)

    expect(wrapper.find('label').attributes('for')).toBe(textarea.attributes('id'))
    expect(textarea.element.value.slice(textarea.element.selectionStart, textarea.element.selectionEnd)).toBe('{trackGenre}')
    await textarea.trigger('blur')
    expect(wrapper.emitted('blur')).toHaveLength(1)

    await wrapper.setProps({ disabled: true, errorMessage: 'Add a track URL.' })
    expect(textarea.element.disabled).toBe(true)
    expect(textarea.attributes('aria-invalid')).toBe('true')
    expect(wrapper.find('.prompt-input__error').text()).toBe('Add a track URL.')
    expect(textarea.attributes('aria-describedby')).toContain(wrapper.find('.prompt-input__error').attributes('id'))
  })
})
