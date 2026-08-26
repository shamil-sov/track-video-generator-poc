<template>
  <v-app class="app-shell">
    <v-app-bar class="app-bar" elevation="0" height="68">
      <v-container class="page-container app-bar__inner">
        <router-link :to="{ name: 'home' }" class="brand">
          <span class="brand-mark" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </span>
          <span>
            <strong>Track Video</strong>
            <small>Lab</small>
          </span>
        </router-link>

        <nav class="app-nav" aria-label="Main navigation">
          <v-btn
            :to="{ name: 'home' }"
            :variant="route.name === 'home' ? 'tonal' : 'text'"
            rounded="lg"
            prepend-icon="mdi-movie-open-outline"
            aria-label="Cover videos"
          >
            Cover videos
          </v-btn>
          <v-btn
            :to="{ name: 'ai-image-videos' }"
            :variant="route.name === 'ai-image-videos' ? 'tonal' : 'text'"
            rounded="lg"
            prepend-icon="mdi-image-sparkles-outline"
            aria-label="AI-image videos"
          >
            AI-image videos
          </v-btn>
          <v-btn
            :to="{ name: 'style-explorer' }"
            :variant="route.name === 'style-explorer' ? 'tonal' : 'text'"
            rounded="lg"
            prepend-icon="mdi-palette-swatch-outline"
            aria-label="Visual style explorer"
          >
            Style explorer
          </v-btn>
          <v-btn
            :to="{ name: 'insights' }"
            :variant="route.name === 'insights' ? 'tonal' : 'text'"
            rounded="lg"
            prepend-icon="mdi-chart-box-outline"
            aria-label="Cover-video insights"
          >
            Cover insights
          </v-btn>
        </nav>

        <v-chip class="environment-chip" size="small" variant="tonal">
          <span class="environment-dot"></span>
          UAT
        </v-chip>
      </v-container>
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>

    <footer class="app-footer">
      <v-container class="page-container app-footer__inner">
        <span>Track Video Generator · experimental client</span>
        <div class="app-footer__links">
          <a
            href="https://septxumlfc.execute-api.ap-southeast-1.amazonaws.com/api/v1.3/track-video-generator/jobs?limit=50"
            target="_blank"
            rel="noopener"
          >
            Cover-video API
            <v-icon icon="mdi-open-in-new" size="13" />
          </a>
          <a
            href="https://septxumlfc.execute-api.ap-southeast-1.amazonaws.com/api/v1.3/track-video-generator/ai-image-video-jobs?limit=50"
            target="_blank"
            rel="noopener"
          >
            AI-image API
            <v-icon icon="mdi-open-in-new" size="13" />
          </a>
          <a
            href="https://septxumlfc.execute-api.ap-southeast-1.amazonaws.com/api/v1.3/track-video-generator/ai-image-jobs?limit=50"
            target="_blank"
            rel="noopener"
          >
            Style explorer API
            <v-icon icon="mdi-open-in-new" size="13" />
          </a>
        </div>
      </v-container>
    </footer>
  </v-app>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<style scoped>
.app-shell {
  background: rgb(var(--v-theme-background));
}

.app-bar {
  background: rgba(10, 11, 14, 0.9) !important;
  color: #f7f8f4 !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
  backdrop-filter: blur(18px);
}

.app-bar__inner {
  display: grid;
  grid-template-columns: minmax(150px, 1fr) auto minmax(80px, 1fr);
  gap: 20px;
  align-items: center;
  height: 100%;
}

.brand {
  display: flex;
  gap: 11px;
  align-items: center;
  width: fit-content;
  color: inherit;
  text-decoration: none;
}

.brand > span:last-child {
  display: flex;
  flex-direction: column;
}

.brand strong {
  font-size: 0.88rem;
  line-height: 1.05;
  letter-spacing: -0.02em;
}

.brand small {
  color: rgba(247, 248, 244, 0.45);
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
}

.brand-mark {
  display: flex;
  gap: 2px;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  background: #d7ff4f;
  border-radius: 10px;
}

.brand-mark span {
  width: 3px;
  background: #101116;
  border-radius: 99px;
}

.brand-mark span:nth-child(1) {
  height: 8px;
}

.brand-mark span:nth-child(2) {
  height: 17px;
}

.brand-mark span:nth-child(3) {
  height: 12px;
}

.brand-mark span:nth-child(4) {
  height: 20px;
}

.app-nav {
  display: flex;
  gap: 5px;
  justify-self: center;
}

.environment-chip {
  justify-self: end;
  font-weight: 750;
}

.environment-dot {
  width: 6px;
  height: 6px;
  margin-right: 7px;
  background: #d7ff4f;
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(215, 255, 79, 0.8);
}

.app-footer {
  background: #090a0d;
  color: rgba(247, 248, 244, 0.42);
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}

.app-footer__inner {
  display: flex;
  justify-content: space-between;
  padding-top: 24px;
  padding-bottom: 24px;
  font-size: 0.68rem;
}

.app-footer a {
  color: inherit;
  text-decoration: none;
}

.app-footer a:hover {
  color: #d7ff4f;
}

.app-footer__links {
  display: flex;
  gap: 16px;
  justify-content: flex-end;
  flex-wrap: wrap;
}

@media (max-width: 1040px) {
  .app-nav :deep(.v-btn__prepend) {
    margin-inline-end: 0;
  }

  .app-nav :deep(.v-btn__content) {
    display: none;
  }
}

@media (max-width: 640px) {
  .app-bar__inner {
    grid-template-columns: auto 1fr;
  }

  .app-nav {
    justify-self: end;
  }

  .environment-chip {
    display: none;
  }

  .app-footer__inner {
    gap: 12px;
    align-items: flex-start;
    flex-direction: column;
  }

  .app-footer__links {
    flex-wrap: wrap;
  }
}
</style>
