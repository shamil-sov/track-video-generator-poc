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
      path: '/ai-image-videos',
      name: 'ai-image-videos',
      component: () => import('@/views/AiImageVideosView.vue'),
    },
  ],
})

export default router
