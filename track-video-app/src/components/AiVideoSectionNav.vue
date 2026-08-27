<template>
  <nav class="ai-video-section-nav" aria-label="AI-image videos">
    <v-btn
      :to="{ name: 'ai-image-videos' }"
      :variant="route.name === 'ai-image-videos' ? 'tonal' : 'text'"
      :color="route.name === 'ai-image-videos' ? 'primary' : undefined"
      rounded="lg"
      prepend-icon="mdi-movie-open-outline"
    >
      Generate videos
    </v-btn>
    <v-btn
      :to="{ name: 'ai-image-insights' }"
      :variant="route.name === 'ai-image-insights' ? 'tonal' : 'text'"
      :color="route.name === 'ai-image-insights' ? 'primary' : undefined"
      rounded="lg"
      prepend-icon="mdi-chart-box-outline"
    >
      Insights
    </v-btn>
    <v-btn
      :to="{ name: 'ai-image-excluded-styles' }"
      :variant="route.name === 'ai-image-excluded-styles' ? 'tonal' : 'text'"
      :color="route.name === 'ai-image-excluded-styles' ? 'primary' : undefined"
      rounded="lg"
      prepend-icon="mdi-image-off-outline"
    >
      Not-included visual styles
    </v-btn>
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<style scoped>
.ai-video-section-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  width: fit-content;
  max-width: 100%;
  margin-bottom: 18px;
  padding: 5px;
  background: rgba(var(--v-theme-surface), 0.72);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.09);
  border-radius: 14px;
}

@media (max-width: 620px) {
  .ai-video-section-nav {
    width: 100%;
  }

  .ai-video-section-nav :deep(.v-btn) {
    flex: 1;
  }
}
</style>
