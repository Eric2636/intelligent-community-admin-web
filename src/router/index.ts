import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '../views/LoginView.vue';
import UsersView from '../views/UsersView.vue';
import AdminsView from '../views/AdminsView.vue';
import ContentView from '../views/ContentView.vue';
import MallCategoriesView from '../views/MallCategoriesView.vue';
import MiniModuleEntryView from '../views/MiniModuleEntryView.vue';
import MiniApiErrorLogsView from '../views/MiniApiErrorLogsView.vue';
import SystemLogsView from '../views/SystemLogsView.vue';
import SystemNoticePublishView from '../views/SystemNoticePublishView.vue';
import ApiEndpointsView from '../views/ApiEndpointsView.vue';
import ApiAccessLogsView from '../views/ApiAccessLogsView.vue';
import FeedbacksView from '../views/FeedbacksView.vue';

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login', component: LoginView, meta: { public: true, title: '登录' } },
    { path: '/', redirect: '/users' },
    { path: '/users', component: UsersView, meta: { title: '用户管理' } },
    { path: '/feedbacks', component: FeedbacksView, meta: { title: '意见反馈' } },
    { path: '/admins', component: AdminsView, meta: { superAdminOnly: true, title: '管理员管理' } },
    { path: '/mini-modules', component: MiniModuleEntryView, meta: { superAdminOnly: true, title: '小程序入口管理' } },
    { path: '/mini-api-error-logs', component: MiniApiErrorLogsView, meta: { superAdminOnly: true, title: '小程序异常上报' } },
    { path: '/system-logs', component: SystemLogsView, meta: { superAdminOnly: true, title: '操作审计' } },
    { path: '/system-notices', component: SystemNoticePublishView, meta: { superAdminOnly: true, title: '系统通知' } },
    { path: '/api-endpoints', component: ApiEndpointsView, meta: { superAdminOnly: true, title: '接口日志设置' } },
    { path: '/api-access-logs', component: ApiAccessLogsView, meta: { superAdminOnly: true, title: '接口监控' } },
    { path: '/api-error-logs', redirect: '/api-access-logs' },
    { path: '/mall-categories', component: MallCategoriesView, meta: { superAdminOnly: true, title: '市场分类' } },
    { path: '/contents/:type', component: ContentView, meta: { title: '内容管理' } },
  ],
});

router.beforeEach((to) => {
  const token = localStorage.getItem('admin_token');
  if (!to.meta.public && !token) return '/login';

  if (to.meta.public) return true;
  let storedAdmin: { id?: unknown; role?: unknown } = {};
  try {
    const raw = localStorage.getItem('admin_user');
    storedAdmin = raw ? JSON.parse(raw) : {};
  } catch {
    return '/login';
  }
  const adminId =
    typeof storedAdmin.id === 'string' && /^[A-Za-z0-9_-]{1,191}$/.test(storedAdmin.id)
      ? storedAdmin.id
      : '';
  if (!adminId) return '/login';
  const role = storedAdmin.role;
  if (to.meta.superAdminOnly && role !== 'SUPERADMIN') return '/users';

  return true;
});
