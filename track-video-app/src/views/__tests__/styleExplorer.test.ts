// @vitest-environment happy-dom

import { computed, defineComponent, ref } from 'vue'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import StyleExplorerView from '@/views/StyleExplorerView.vue'
import { useAiGeneratedImages } from '@/composables/useAiGeneratedImages'
import type { AiGeneratedImageJob } from '@/types/aiImageGeneration'

vi.mock('@/composables/useAiGeneratedImages', () => ({ useAiGeneratedImages: vi.fn() }))

const containerStub = defineComponent({ template: '<div><slot /></div>' })
const buttonStub = defineComponent({ template: '<button type="button"><slot /></button>' })
const inputStub = defineComponent({
  props: ['modelValue', 'label', 'disabled', 'errorMessages'],
  emits: ['update:modelValue', 'blur'],
  template: `
    <label>
      {{ label }}
      <input :value="modelValue || ''" :disabled="disabled"
        @input="$emit('update:modelValue', $event.target.value)" @blur="$emit('blur')" />
      <span class="field-error">{{ errorMessages }}</span>
    </label>
  `,
})

function createState() {
  return {
    jobs: ref<AiGeneratedImageJob[]>([]),
    activeJobCount: computed(() => 0),
    jobsLoading: ref(false),
    refreshing: ref(false),
    submitting: ref(false),
    deletingJobIds: ref(new Set<string>()),
    error: computed(() => null),
    lastUpdatedAt: ref<Date | null>(null),
    loadJobs: vi.fn().mockResolvedValue(undefined),
    refreshJobs: vi.fn().mockResolvedValue(undefined),
    submitJob: vi.fn().mockResolvedValue(true),
    deleteJob: vi.fn().mockResolvedValue(true),
    clearError: vi.fn(),
    stopPolling: vi.fn(),
  }
}

function mountExplorer() {
  return mount(StyleExplorerView, {
    global: {
      stubs: {
        VContainer: containerStub,
        VCard: containerStub,
        VChip: buttonStub,
        VBtn: buttonStub,
        VIcon: containerStub,
        VAlert: containerStub,
        VDialog: true,
        VSnackbar: true,
        VSelect: true,
        VSkeletonLoader: true,
        VTextField: inputStub,
        AiGeneratedImageCard: true,
      },
    },
  })
}

enableAutoUnmount(afterEach)

describe('Style Explorer prompt guidance', () => {
  let state: ReturnType<typeof createState>

  beforeEach(() => {
    vi.clearAllMocks()
    state = createState()
    vi.mocked(useAiGeneratedImages).mockReturnValue(state)
  })

  it('offers exactly two directions and highlights both placeholders in each', async () => {
    const wrapper = mountExplorer()
    const directions = wrapper.findAll('.prompt-ideas button')
    expect(wrapper.get('.prompt-ideas > span').text()).toBe('Examples')
    expect(directions.map(button => button.text())).toEqual(['Woodblock print', 'Dreamlike editorial'])

    for (const direction of directions) {
      await direction.trigger('click')
      const prompt = wrapper.get('textarea').element.value
      expect(prompt).toContain('{trackName}')
      expect(prompt).toContain('{trackGenre}')
      expect(wrapper.findAll('.prompt-input__token').map(token => token.text())).toEqual(
        expect.arrayContaining(['{trackName}', '{trackGenre}']),
      )
    }
    expect(state.submitJob).not.toHaveBeenCalled()
  })

  it('uses a functional header and labels without promotional content', () => {
    const wrapper = mountExplorer()
    expect(wrapper.get('.page-header h1').text()).toBe('Style explorer')
    expect(wrapper.find('.hero').exists()).toBe(false)
    expect(wrapper.find('.eyebrow').exists()).toBe(false)
    expect(wrapper.get('.generator-header h2').text()).toBe('Generate image')
    expect(wrapper.get('.gallery-header h2').text()).toBe('Image history')
    expect(wrapper.get('.empty-state h3').text()).toBe('No image jobs yet')
    expect(wrapper.text()).not.toContain('Open visual playground')
    expect(wrapper.text()).not.toContain('What should the image feel like?')
    expect(wrapper.text()).not.toContain('Shared experiments')
    expect(wrapper.findAll('.job-summary dt').map(label => label.text())).toEqual(['Jobs', 'Completed', 'Generating'])
    expect(wrapper.findAll('.job-summary dd').map(value => value.text())).toEqual(['0', '0', '0'])
    expect(wrapper.text()).toContain('Prompts and generated images are publicly accessible.')
  })

  it('puts the track URL and accessible placeholder guide above the prompt', () => {
    const wrapper = mountExplorer()
    const fields = wrapper.findAll('.prompt-fields input, .prompt-fields textarea')
    expect(fields.map(field => field.element.tagName)).toEqual(['INPUT', 'TEXTAREA'])
    const guide = wrapper.get('#style-placeholder-guide')
    expect(guide.findAll('code').map(token => token.text())).toEqual(['{trackName}', '{trackGenre}'])
    expect(guide.text()).toContain('They are filled in automatically')
    expect(guide.element.compareDocumentPosition(wrapper.get('textarea').element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(wrapper.get('textarea').attributes('aria-describedby')?.split(' ')).toContain(guide.attributes('id'))
    expect(wrapper.find('.track-context').exists()).toBe(false)
  })

  it.each([0, 1])('requires a track for preset %i and sends both placeholders unchanged', async index => {
    const wrapper = mountExplorer()
    await wrapper.findAll('.prompt-ideas button')[index].trigger('click')
    const prompt = wrapper.get('textarea').element.value
    await wrapper.get('form').trigger('submit')
    expect(wrapper.get('.prompt-input__error').text()).toContain('Add a BandLab track URL above')
    expect(state.submitJob).not.toHaveBeenCalled()

    const trackUrl = 'https://test.bandlab.com/track/5f42bf92-e3de-ed11-8aae-501ac5ee31b6'
    await wrapper.get('.prompt-fields input').setValue(`  ${trackUrl}  `)
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(state.submitJob).toHaveBeenCalledExactlyOnceWith(prompt, trackUrl)
    expect(wrapper.get('textarea').element.value).toBe('')
  })

  it('still permits a custom prompt without track placeholders or a track URL', async () => {
    const wrapper = mountExplorer()
    await wrapper.get('textarea').setValue('A glass sculpture above a midnight ocean')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(state.submitJob).toHaveBeenCalledExactlyOnceWith('A glass sculpture above a midnight ocean', undefined)
  })

  it('validates the track URL and disables presets while submitting', async () => {
    const wrapper = mountExplorer()
    await wrapper.findAll('.prompt-ideas button')[0].trigger('click')
    await wrapper.get('.prompt-fields input').setValue('https://example.com/not-a-track')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.get('.prompt-fields .field-error').text()).toBe('Use a valid public BandLab track URL.')
    expect(state.submitJob).not.toHaveBeenCalled()

    state.submitting.value = true
    await flushPromises()
    const prompt = wrapper.get('textarea').element.value
    await wrapper.findAll('.prompt-ideas button')[1].trigger('click')
    expect(wrapper.get('textarea').element.value).toBe(prompt)
    expect(wrapper.findAll('.prompt-ideas button').every(button => (button.element as HTMLButtonElement).disabled)).toBe(true)
  })
})
