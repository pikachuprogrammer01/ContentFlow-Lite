/**
 * Vue Router 配置
 */

import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/pages/HomePage.vue'),
    },
    {
      path: '/edit/:id?',
      name: 'edit',
      component: () => import('@/pages/EditPage.vue'),
    },
    {
      path: '/history',
      name: 'history',
      component: () => import('@/pages/HistoryPage.vue'),
    },
    {
      path: '/prompt',
      name: 'prompt',
      component: () => import('@/pages/PromptPage.vue'),
    },
  ],
});

export default router;
