<template>
  <v-dialog v-model="model" max-width="1180" scrollable :persistent="submitting">
    <v-card class="wizard-card" rounded="xl" elevation="24">
      <header class="wizard-header">
        <div>
          <span class="wizard-kicker">AI-image video</span>
          <h2>{{ step === 1 ? 'Choose a visual style' : 'Choose a video template' }}</h2>
          <p>
            {{ step === 1
              ? 'Pick the art direction that will shape the generated image.'
              : 'Pick how the generated artwork will move with your track.' }}
          </p>
        </div>

        <v-btn
          icon="mdi-close"
          variant="text"
          aria-label="Close generation setup"
          :disabled="submitting"
          @click="model = false"
        />
      </header>

      <div class="wizard-progress" aria-label="Generation setup progress">
        <div class="progress-step progress-step--active">
          <span>1</span>
          <strong>Visual style</strong>
        </div>
        <span class="progress-line" :class="{ 'progress-line--complete': step === 2 }"></span>
        <div class="progress-step" :class="{ 'progress-step--active': step === 2 }">
          <span>2</span>
          <strong>Video template</strong>
        </div>
      </div>

      <v-card-text class="wizard-content">
        <v-alert
          v-if="error"
          type="error"
          variant="tonal"
          closable
          class="mb-5"
          @click:close="$emit('clear-error')"
        >
          {{ error }}
        </v-alert>

        <template v-if="step === 1">
          <div v-if="cataloguesLoading" class="style-loading">
            <v-skeleton-loader type="image, article" />
            <div>
              <v-skeleton-loader v-for="index in 6" :key="index" type="image" />
            </div>
          </div>
          <AiVisualStylePicker
            v-else-if="visualStyles.length"
            v-model="selectedVisualStyle"
            :styles="visualStyles"
          />
          <v-alert v-else type="warning" variant="tonal" density="compact">
            Visual styles are currently unavailable. Close this window and refresh to try again.
          </v-alert>
        </template>

        <template v-else>
          <div v-if="cataloguesLoading" class="template-loading">
            <v-skeleton-loader v-for="index in 4" :key="index" type="image, article" />
          </div>
          <AiVideoTemplatePicker
            v-else-if="videoTemplates.length"
            v-model="selectedTemplate"
            :templates="videoTemplates"
          />
          <v-alert v-else type="warning" variant="tonal" density="compact">
            Video templates are currently unavailable. Close this window and refresh to try again.
          </v-alert>
        </template>
      </v-card-text>

      <footer class="wizard-footer">
        <div class="wizard-summary">
          <v-icon icon="mdi-clock-fast" size="18" />
          <span>Creates a 15-second video from the start of the track</span>
        </div>

        <div class="wizard-actions">
          <v-btn
            v-if="step === 1"
            variant="text"
            :disabled="submitting"
            @click="model = false"
          >
            Cancel
          </v-btn>
          <v-btn
            v-else
            variant="text"
            prepend-icon="mdi-arrow-left"
            :disabled="submitting"
            @click="step = 1"
          >
            Back
          </v-btn>

          <v-btn
            v-if="step === 1"
            color="primary"
            rounded="lg"
            append-icon="mdi-arrow-right"
            :disabled="!selectedVisualStyle || cataloguesLoading"
            @click="step = 2"
          >
            Continue
          </v-btn>
          <v-btn
            v-else
            color="primary"
            rounded="lg"
            prepend-icon="mdi-image-sparkles-outline"
            :loading="submitting"
            :disabled="!selectedTemplate || cataloguesLoading"
            @click="submit"
          >
            Generate video
          </v-btn>
        </div>
      </footer>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import AiVideoTemplatePicker from '@/components/AiVideoTemplatePicker.vue'
import AiVisualStylePicker from '@/components/AiVisualStylePicker.vue'
import type {
  AiImageVideoTemplate,
  AiImageVisualStyle,
} from '@/types/aiImageTrackVideo'

defineProps<{
  visualStyles: AiImageVisualStyle[]
  videoTemplates: AiImageVideoTemplate[]
  cataloguesLoading: boolean
  submitting: boolean
  error: string | null
}>()

const emit = defineEmits<{
  submit: [selection: { visualStyle: string; template: string }]
  'clear-error': []
}>()

const model = defineModel<boolean>({ required: true })
const step = ref<1 | 2>(1)
const selectedVisualStyle = ref<string | null>(null)
const selectedTemplate = ref<string | null>(null)

watch(model, isOpen => {
  if (!isOpen) {
    return
  }

  step.value = 1
  selectedVisualStyle.value = null
  selectedTemplate.value = null
})

function submit(): void {
  if (!selectedVisualStyle.value || !selectedTemplate.value) {
    return
  }

  emit('submit', {
    visualStyle: selectedVisualStyle.value,
    template: selectedTemplate.value,
  })
}
</script>

<style scoped>
.wizard-card {
  max-height: min(90vh, 900px);
  background:
    radial-gradient(circle at 100% 0, rgba(255, 95, 210, 0.09), transparent 30%),
    rgb(var(--v-theme-surface));
}

.wizard-header {
  display: flex;
  gap: 24px;
  align-items: flex-start;
  justify-content: space-between;
  padding: 25px 28px 18px;
}

.wizard-kicker {
  color: #ff86dc;
  font-size: 0.67rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.13em;
}

.wizard-header h2 {
  margin: 5px 0 0;
  font-size: clamp(1.65rem, 3vw, 2.35rem);
  line-height: 1.08;
  letter-spacing: -0.045em;
}

.wizard-header p {
  margin: 7px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.52);
  font-size: 0.8rem;
}

.wizard-progress {
  display: grid;
  grid-template-columns: auto minmax(40px, 110px) auto;
  gap: 10px;
  align-items: center;
  padding: 0 28px 20px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.progress-step {
  display: flex;
  gap: 8px;
  align-items: center;
  color: rgba(var(--v-theme-on-surface), 0.38);
}

.progress-step > span {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  font-size: 0.7rem;
  font-weight: 800;
  border: 1px solid currentcolor;
  border-radius: 50%;
}

.progress-step strong {
  font-size: 0.72rem;
}

.progress-step--active {
  color: rgb(var(--v-theme-primary));
}

.progress-step--active > span {
  color: #0d0e12;
  background: rgb(var(--v-theme-primary));
  border-color: rgb(var(--v-theme-primary));
}

.progress-line {
  height: 1px;
  background: rgba(var(--v-theme-on-surface), 0.14);
}

.progress-line--complete {
  background: rgb(var(--v-theme-primary));
}

.wizard-content {
  min-height: 420px;
  padding: 24px 28px !important;
}

.style-loading > div:last-child,
.template-loading {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.style-loading > div:last-child {
  grid-template-columns: repeat(6, minmax(0, 1fr));
  margin-top: 12px;
}

.wizard-footer {
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
  padding: 16px 28px;
  background: rgba(var(--v-theme-on-surface), 0.025);
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.wizard-summary,
.wizard-actions {
  display: flex;
  gap: 9px;
  align-items: center;
}

.wizard-summary {
  color: rgba(var(--v-theme-on-surface), 0.48);
  font-size: 0.72rem;
}

@media (max-width: 620px) {
  .wizard-header,
  .wizard-content,
  .wizard-footer {
    padding-right: 18px !important;
    padding-left: 18px !important;
  }

  .wizard-progress {
    padding-right: 18px;
    padding-left: 18px;
  }

  .progress-step strong,
  .wizard-summary {
    display: none;
  }

  .wizard-footer {
    justify-content: flex-end;
  }

  .wizard-actions {
    width: 100%;
  }

  .wizard-actions .v-btn {
    flex: 1;
  }
}
</style>
