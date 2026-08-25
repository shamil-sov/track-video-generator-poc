// @vitest-environment happy-dom

import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AiImageGenerationWizard from '@/components/AiImageGenerationWizard.vue'
import AiImageJobCard from '@/components/AiImageJobCard.vue'
import AiVideoTemplatePicker from '@/components/AiVideoTemplatePicker.vue'
import AiVisualStylePicker from '@/components/AiVisualStylePicker.vue'
import type { AiImageVideoJob } from '@/types/aiImageTrackVideo'

const imageStub = defineComponent({
  inheritAttrs: false,
  props: {
    src: String,
    alt: String,
  },
  emits: ['error'],
  template: '<img :src="src" :alt="alt" @error="$emit(\'error\')">',
})

const cardStub = defineComponent({
  inheritAttrs: false,
  template: '<div v-bind="$attrs"><slot /></div>',
})

const dialogStub = defineComponent({
  props: {
    modelValue: Boolean,
  },
  template: '<div class="dialog-stub" :data-open="modelValue"><slot /></div>',
})

const buttonStub = defineComponent({
  inheritAttrs: false,
  template: '<button v-bind="$attrs"><slot /></button>',
})

const passthroughStub = defineComponent({
  template: '<div><slot /></div>',
})

describe('AI-image picker components', () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  })

  it('falls back when a style image fails and supports arrow-key selection', async () => {
    const wrapper = mount(AiVisualStylePicker, {
      props: {
        modelValue: 'first',
        styles: [
          { id: 'first', name: 'First', exampleImageUrls: ['https://cdn.example/first.jpg'] },
          { id: 'second', name: 'Second', exampleImageUrls: ['https://cdn.example/second.jpg'] },
        ],
      },
      global: {
        stubs: {
          VImg: imageStub,
          VIcon: passthroughStub,
          VBtn: buttonStub,
          VTextField: passthroughStub,
        },
      },
    })

    await wrapper.find('img').trigger('error')
    expect(wrapper.find('.selected-preview .image-placeholder').exists()).toBe(true)

    await wrapper.findAll('.style-card')[0].trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['second'])
  })

  it('shows a fallback for an unavailable template preview and supports arrow keys', async () => {
    const wrapper = mount(AiVideoTemplatePicker, {
      props: {
        modelValue: 'orbit',
        templates: [
          {
            id: 'orbit',
            name: 'Orbit',
            description: 'Orbit motion',
            exampleVideoUrl: 'https://cdn.example/orbit.mp4',
          },
          {
            id: 'vinyl-orbit',
            name: 'Vinyl',
            description: 'Vinyl motion',
            exampleVideoUrl: 'https://cdn.example/vinyl.mp4',
          },
        ],
      },
      global: {
        stubs: {
          VIcon: passthroughStub,
        },
      },
    })

    expect(wrapper.find('.selected-template').exists()).toBe(true)
    expect(wrapper.text()).toContain('Selected video template')

    await wrapper.find('video').trigger('error')
    expect(wrapper.text()).toContain('Unavailable')

    await wrapper.findAll('.template-card')[0].trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['vinyl-orbit'])
  })

  it('submits after the user chooses a visual style', async () => {
    const wrapper = mount(AiImageGenerationWizard, {
      props: {
        modelValue: true,
        visualStyles: [
          { id: 'living-impasto', name: 'Living Impasto', exampleImageUrls: ['https://cdn.example/style.jpg'] },
        ],
        cataloguesLoading: false,
        submitting: false,
        error: null,
      },
      global: {
        stubs: {
          VDialog: dialogStub,
          VCard: cardStub,
          VCardText: passthroughStub,
          VImg: imageStub,
          VIcon: passthroughStub,
          VBtn: buttonStub,
          VTextField: passthroughStub,
          VAlert: passthroughStub,
        },
      },
    })

    expect(wrapper.text()).toContain('Choose a visual style')
    await wrapper.find('.style-card').trigger('click')

    const generateButton = wrapper.findAll('.wizard-actions button')
      .find(button => button.text().includes('Generate video'))
    expect(generateButton).toBeDefined()
    await generateButton!.trigger('click')

    expect(wrapper.emitted('submit')?.at(-1)).toEqual([{
      visualStyle: 'living-impasto',
    }])
  })
})

describe('AiImageJobCard', () => {
  it('opens with the Space key and replaces a failed video preview with guidance', async () => {
    const completedJob: AiImageVideoJob = {
      jobId: 'job-id',
      trackUrl: 'https://test.bandlab.com/track/5f42bf92-e3de-ed11-8aae-501ac5ee31b6',
      postId: '5f42bf92-e3de-ed11-8aae-501ac5ee31b6',
      revisionId: null,
      template: 'orbit',
      visualStyle: 'living-impasto',
      assignedGenre: 'Blues',
      status: 'completed',
      track: null,
      triggeredAt: '2026-08-23T10:00:00Z',
      processingStartedAt: '2026-08-23T10:00:01Z',
      finishedAt: '2026-08-23T10:00:30Z',
      updatedAt: '2026-08-23T10:00:30Z',
      queueDurationMs: 1000,
      processingDurationMs: 29000,
      totalDurationMs: 30000,
      videoUrl: 'https://cdn.example/video.mp4',
      thumbnailUrl: 'https://cdn.example/thumbnail.jpg',
      error: null,
    }

    const wrapper = mount(AiImageJobCard, {
      props: {
        job: completedJob,
        templateName: 'Orbit',
        visualStyleName: 'Living Impasto',
      },
      global: {
        stubs: {
          VCard: cardStub,
          VDialog: dialogStub,
          VImg: imageStub,
          VBtn: buttonStub,
          VChip: passthroughStub,
          VIcon: passthroughStub,
          VProgressCircular: passthroughStub,
          VDivider: passthroughStub,
          VAlert: passthroughStub,
          StatusChip: passthroughStub,
        },
      },
    })

    expect(wrapper.find('.job-card').attributes('role')).toBe('button')
    await wrapper.find('.job-card').trigger('keydown', { key: ' ' })
    expect(wrapper.find('.dialog-stub').attributes('data-open')).toBe('true')

    await wrapper.find('video').trigger('error')
    expect(wrapper.text()).toContain('The video preview could not be loaded')
  })
})
