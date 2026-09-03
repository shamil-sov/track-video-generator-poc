<template>
  <nav class="cover-section-nav" aria-label="Cover videos">
    <v-btn
      :to="{ name: 'home' }"
      :variant="route.name === 'home' ? 'tonal' : 'text'"
      :color="route.name === 'home' ? 'primary' : undefined"
      rounded="lg"
      prepend-icon="mdi-movie-open-outline"
    >
      Generate videos
    </v-btn>
    <v-btn
      :to="{ name: 'insights' }"
      :variant="route.name === 'insights' ? 'tonal' : 'text'"
      :color="route.name === 'insights' ? 'primary' : undefined"
      rounded="lg"
      prepend-icon="mdi-chart-box-outline"
    >
      Insights
    </v-btn>
    <v-btn
      :to="{ name: 'cover-video-previews' }"
      :variant="route.name === 'cover-video-previews' ? 'tonal' : 'text'"
      :color="route.name === 'cover-video-previews' ? 'primary' : undefined"
      rounded="lg"
      prepend-icon="mdi-motion-play-outline"
    >
      Template previews
    </v-btn>
    <v-btn
      :to="{ name: 'cover-template-comparison' }"
      :variant="route.name === 'cover-template-comparison' ? 'tonal' : 'text'"
      :color="route.name === 'cover-template-comparison' ? 'primary' : undefined"
      rounded="lg"
      prepend-icon="mdi-view-grid-outline"
    >
      Compare templates
    </v-btn>
  </nav>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<style scoped>
.cover-section-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  width: fit-content;
  margin-bottom: 18px;
  padding: 5px;
  background: rgba(var(--v-theme-surface), 0.72);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.09);
  border-radius: 14px;
}

@media (max-width: 620px) {
  .cover-section-nav {
    width: 100%;
  }

  .cover-section-nav :deep(.v-btn) {
    flex: 1 1 auto;
  }
}
</style>
