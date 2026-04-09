import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'canvas',
      component: () => import('@/views/canvas/index.vue'),
      meta: { title: '画布编排' },
    },
    {
      path: '/roles',
      name: 'roles',
      component: () => import('@/views/iam/role-list.vue'),
      meta: { title: '角色管理' },
    },
    {
      path: '/resources',
      name: 'resources',
      component: () => import('@/views/resource/resource-list.vue'),
      meta: { title: '资源管理' },
    },
    {
      path: '/simulation',
      name: 'simulation',
      component: () => import('@/views/simulation/index.vue'),
      meta: { title: '模拟运行' },
    },
  ],
});

router.beforeEach((to, from, next) => {
  document.title = `${to.meta.title || 'VisPerm'} - 可视化权限拓扑编排系统`;
  next();
});

export default router;
