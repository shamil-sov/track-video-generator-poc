<template>
  <div class="prompt-input" :class="{ 'prompt-input--invalid': errorMessage, 'prompt-input--disabled': disabled }">
    <div class="prompt-input__field">
      <label :for="inputId" class="prompt-input__label">Describe the visual style or scene</label>
      <div class="prompt-input__layers">
        <div class="prompt-input__highlights" aria-hidden="true">
          <span
            v-for="(part, index) in parts"
            :key="index"
            :class="{ 'prompt-input__token': isPlaceholder(part) }"
          >{{ part }}</span>
        </div>
        <textarea
          :id="inputId"
          v-model="model"
          class="prompt-input__textarea"
          rows="6"
          placeholder="A translucent glass sculpture floating above a midnight ocean..."
          :aria-describedby="[descriptionId, `${inputId}-error`, `${inputId}-counter`].filter(Boolean).join(' ')"
          :aria-invalid="Boolean(errorMessage)"
          :disabled="disabled"
          @blur="$emit('blur')"
        ></textarea>
      </div>
    </div>
    <div class="prompt-input__details">
      <span :id="`${inputId}-error`" class="prompt-input__error" aria-live="polite">{{ errorMessage }}</span>
      <span :id="`${inputId}-counter`" class="prompt-input__counter">{{ model.length }} / 2000</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'

defineProps<{
  disabled?: boolean
  errorMessage?: string | null
  descriptionId?: string
}>()
defineEmits<{
  blur: []
}>()
const model = defineModel<string>({ required: true })
const inputId = `style-prompt-${useId()}`
const parts = computed(() => [...model.value.split(/(\{trackGenre\}|\{trackName\})/g), '\u200b'])

function isPlaceholder(value: string): boolean {
  return value === '{trackGenre}' || value === '{trackName}'
}
</script>

<style scoped>
.prompt-input__field {
  position: relative;
  margin-top: 8px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.42);
  border-radius: 14px;
}

.prompt-input__field:focus-within {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 1px rgb(var(--v-theme-primary));
}

.prompt-input__label {
  position: absolute;
  top: -9px;
  left: 12px;
  z-index: 2;
  max-width: calc(100% - 24px);
  padding: 0 4px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-size: 0.75rem;
  line-height: 18px;
  background: rgb(var(--v-theme-surface));
}

.prompt-input__field:focus-within .prompt-input__label {
  color: rgb(var(--v-theme-primary));
}

.prompt-input__layers {
  display: grid;
}

/* Identical text metrics keep the highlight backgrounds aligned with the native textarea.
   The mirror grows the field, including an empty final line, without rewriting input or selection. */
.prompt-input__highlights,
.prompt-input__textarea {
  box-sizing: border-box;
  grid-area: 1 / 1;
  min-width: 0;
  width: 100%;
  margin: 0;
  padding: 16px;
  border: 0;
  font: inherit;
  font-size: 1rem;
  line-height: 1.5;
  letter-spacing: normal;
  text-align: start;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  word-break: normal;
  tab-size: 8;
}

.prompt-input__highlights {
  color: transparent;
  pointer-events: none;
  user-select: none;
}

.prompt-input__token {
  padding: 0;
  color: inherit;
  font: inherit;
  background: rgba(var(--v-theme-primary), 0.22);
  border-radius: 3px;
  box-shadow: inset 0 -1px 0 rgba(var(--v-theme-primary), 0.55);
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
}

.prompt-input__textarea {
  position: relative;
  overflow: hidden;
  color: rgb(var(--v-theme-on-surface));
  background: transparent;
  outline: none;
  resize: none;
}

.prompt-input__textarea::placeholder {
  color: rgba(var(--v-theme-on-surface), 0.38);
}

.prompt-input__details {
  display: flex;
  gap: 12px;
  justify-content: space-between;
  min-height: 30px;
  padding: 6px 16px 0;
  font-size: 0.75rem;
  line-height: 1.4;
}

.prompt-input__counter {
  flex-shrink: 0;
  color: rgba(var(--v-theme-on-surface), 0.55);
}

.prompt-input--invalid .prompt-input__field {
  border-color: rgb(var(--v-theme-error));
}

.prompt-input--invalid .prompt-input__field:focus-within {
  box-shadow: 0 0 0 1px rgb(var(--v-theme-error));
}

.prompt-input--invalid .prompt-input__label,
.prompt-input__error {
  color: rgb(var(--v-theme-error));
}

.prompt-input--disabled {
  opacity: 0.5;
}
</style>
