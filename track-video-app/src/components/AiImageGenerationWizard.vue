<template>
  <v-dialog v-model="model" max-width="1180" scrollable :persistent="submitting">
    <v-card class="wizard-card" rounded="xl" elevation="24">
      <header class="wizard-header">
        <div>
          <span class="wizard-kicker">AI-image video</span>
          <h2>Choose a visual style</h2>
          <p>Pick the art direction that will shape the generated image.</p>
        </div>

        <v-btn
          icon="mdi-close"
          variant="text"
          aria-label="Close generation setup"
          :disabled="submitting"
          @click="model = false"
        />
      </header>

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
      </v-card-text>

      <footer class="wizard-footer">
        <div class="wizard-summary">
          <v-icon icon="mdi-clock-fast" size="18" />
          <span>Creates a 15-second video from the start of the track</span>
        </div>

        <div class="wizard-actions">
          <v-btn
            variant="text"
            :disabled="submitting"
            @click="model = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            rounded="lg"
            prepend-icon="mdi-image-sparkles-outline"
            :loading="submitting"
            :disabled="!selectedVisualStyle || cataloguesLoading"
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
import AiVisualStylePicker from '@/components/AiVisualStylePicker.vue'
import type { AiImageVisualStyle } from '@/types/aiImageTrackVideo'

defineProps<{
  visualStyles: AiImageVisualStyle[]
  cataloguesLoading: boolean
  submitting: boolean
  error: string | null
}>()

const emit = defineEmits<{
  submit: [selection: { visualStyle: string }]
  'clear-error': []
}>()

const model = defineModel<boolean>({ required: true })
const selectedVisualStyle = ref<string | null>(null)

watch(model, isOpen => {
  if (!isOpen) {
    return
  }

  selectedVisualStyle.value = null
})

function submit(): void {
  if (!selectedVisualStyle.value) {
    return
  }

  emit('submit', {
    visualStyle: selectedVisualStyle.value,
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

.wizard-content {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  min-height: 420px;
  padding: 24px 28px !important;
}

.style-loading > div:last-child {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
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
