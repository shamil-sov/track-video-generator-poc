import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import InsightsView from '@/views/InsightsView.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/insights',
      name: 'insights',
      component: InsightsView,
    },
    {
      path: '/video-previews',
      name: 'cover-video-previews',
      component: () => import('@/views/CoverVideoPreviewsView.vue'),
    },
    {
      path: '/ai-image-videos',
      name: 'ai-image-videos',
      component: () => import('@/views/AiImageVideosView.vue'),
    },
    {
      path: '/ai-image-videos/insights',
      name: 'ai-image-insights',
      component: () => import('@/views/AiImageInsightsView.vue'),
    },
    {
      path: '/ai-image-videos/excluded-styles',
      name: 'ai-image-excluded-styles',
      component: () => import('@/views/AiImageExcludedStylesView.vue'),
    },
    {
      path: '/style-explorer',
      name: 'style-explorer',
      component: () => import('@/views/StyleExplorerView.vue'),
    },
  ],
})

export default router
