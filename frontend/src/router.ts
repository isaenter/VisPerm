import { createRouter, createWebHistory } from 'vue-router';
import MainLayout from '@/layouts/MainLayout.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: MainLayout,
      children: [
        {
          path: '',
          name: 'canvas',
          component: () => import('@/views/canvas/index.vue'),
          meta: { title: '画布编排' },
        },
        {
          path: 'roles',
          name: 'roles',
          component: () => import('@/views/iam/role-list.vue'),
          meta: { title: '角色管理' },
        },
        {
          path: 'resources',
          name: 'resources',
          component: () => import('@/views/resource/resource-list.vue'),
          meta: { title: '资源管理' },
        },
        {
          path: 'topologies',
          name: 'topologies',
          component: () => import('@/views/topology/topology-list.vue'),
          meta: { title: '拓扑管理' },
        },
        {
          path: 'user-roles',
          name: 'user-roles',
          component: () => import('@/views/iam/user-role-management.vue'),
          meta: { title: '用户角色' },
        },
        {
          path: 'simulation',
          name: 'simulation',
          component: () => import('@/views/simulation/index.vue'),
          meta: { title: '模拟运行' },
        },
        {
          path: 'audit-logs',
          name: 'audit-logs',
          component: () => import('@/views/audit/audit-log.vue'),
          meta: { title: '审计日志' },
        },
      ],
    },
  ],
});

router.beforeEach((to, from, next) => {
  document.title = `${to.meta.title || 'VisPerm'} - 可视化权限拓扑编排系统`;
  next();
});

export default router;
