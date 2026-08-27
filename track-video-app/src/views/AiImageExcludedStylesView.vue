<template>
  <main class="excluded-styles-page">
    <v-container class="page-container content-container">
      <AiVideoSectionNav />

      <section aria-labelledby="excluded-styles-heading">
        <div class="styles-header">
          <div>
            <h1 id="excluded-styles-heading">Excluded visual styles</h1>
            <p>Preview only. These styles are excluded from video generation.</p>
          </div>
          <v-btn
            variant="tonal"
            prepend-icon="mdi-refresh"
            aria-label="Refresh excluded visual styles"
            :loading="loading"
            :disabled="loading"
            @click="loadStyles"
          >
            Refresh
          </v-btn>
        </div>

        <v-alert v-if="error" type="error" variant="tonal" class="mb-5" role="alert">
          {{ error }}
          <template #append>
            <v-btn variant="text" :disabled="loading" @click="loadStyles">Retry</v-btn>
          </template>
        </v-alert>

        <div v-if="loading" role="status" aria-label="Loading excluded visual styles">
          <v-skeleton-loader type="image, article" />
        </div>
        <AiVisualStylePicker
          v-else-if="styles.length"
          v-model="selectedStyle"
          :styles="styles"
        />
        <p v-else-if="!error" class="empty-state">No excluded visual styles.</p>
      </section>
    </v-container>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AiVideoSectionNav from '@/components/AiVideoSectionNav.vue'
import AiVisualStylePicker from '@/components/AiVisualStylePicker.vue'
import { getAiImageExcludedVisualStyles } from '@/services/api'
import type { AiImageVisualStyle } from '@/types/aiImageTrackVideo'

const styles = ref<AiImageVisualStyle[]>([])
const selectedStyle = ref<string | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

async function loadStyles(): Promise<void> {
  if (loading.value) {
    return
  }

  loading.value = true
  error.value = null
  try {
    const fetchedStyles = await getAiImageExcludedVisualStyles()
    styles.value = fetchedStyles
    if (!fetchedStyles.some(style => style.id === selectedStyle.value)) {
      selectedStyle.value = fetchedStyles[0]?.id || null
    }
  } catch (errorValue) {
    error.value = errorValue instanceof Error
      ? errorValue.message
      : 'Could not load excluded visual styles.'
  } finally {
    loading.value = false
  }
}

onMounted(loadStyles)
</script>

<style scoped>
.excluded-styles-page {
  min-height: calc(100vh - 68px);
}

.content-container {
  padding-top: 38px;
  padding-bottom: 80px;
}

.styles-header {
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.styles-header h1 {
  margin: 0;
  font-size: clamp(1.5rem, 3vw, 2rem);
  line-height: 1.2;
  letter-spacing: -0.035em;
}

.styles-header p {
  margin: 7px 0 0;
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 0.82rem;
}

.empty-state {
  padding: 36px 20px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  text-align: center;
}

@media (max-width: 620px) {
  .styles-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
