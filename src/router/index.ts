/**
 * Vue Router 配置
 *
 * 路由守卫：未登录用户自动跳转 /login（/login 自身除外）。
 */

import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/pages/LoginPage.vue'),
      meta: { public: true },
    },
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
    {
      path: '/profile',
      name: 'profile',
      component: () => import('@/pages/ProfilePage.vue'),
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/pages/AdminPage.vue'),
      meta: { admin: true },
    },
  ],
});

// ── 全局导航守卫 ────────────────────────────────────────
router.beforeEach(async (to, _from, next) => {
  // 公开页面（登录页）直接放行
  if (to.meta.public) {
    next();
    return;
  }

  const auth = useAuthStore();

  // 已有 token 但未加载用户信息 → 先拉取
  if (auth.token && !auth.user) {
    const ok = await auth.fetchUser();
    if (ok) {
      next();
      return;
    }
  }

  if (auth.isAuthenticated) {
    // 管理员页面：仅 admin 角色可访问，否则跳首页
    if (to.meta.admin && auth.user?.role !== 'admin' && auth.user?.role !== 'super_admin') {
      next({ name: 'home' });
      return;
    }
    next();
  } else {
    next({ name: 'login', query: { redirect: to.fullPath } });
  }
});

export default router;
