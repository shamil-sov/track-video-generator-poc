import { ref } from 'vue'
import { getVideoTemplates } from '@/services/api'
import type { TrackVideoTemplate, VideoTemplateCatalogueItem } from '@/types/trackVideo'
import { fallbackTemplateName } from '@/types/trackVideo'

const templates = ref<VideoTemplateCatalogueItem[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

let pendingRequest: Promise<void> | null = null

function errorMessage(errorValue: unknown): string {
  return errorValue instanceof Error
    ? errorValue.message
    : 'Could not load video templates.'
}

function loadTemplates(): Promise<void> {
  if (templates.value.length) {
    return Promise.resolve()
  }
  if (pendingRequest) {
    return pendingRequest
  }

  loading.value = true
  pendingRequest = getVideoTemplates()
    .then(result => {
      templates.value = result
      error.value = null
    })
    .catch(errorValue => {
      error.value = errorMessage(errorValue)
    })
    .finally(() => {
      loading.value = false
      pendingRequest = null
    })

  return pendingRequest
}

function templateName(template: TrackVideoTemplate): string {
  return templates.value.find(item => item.id === template)?.name
    ?? fallbackTemplateName(template)
}

export function useVideoTemplates() {
  return {
    templates,
    loading,
    error,
    loadTemplates,
    templateName,
    clearError: () => {
      error.value = null
    },
  }
}
