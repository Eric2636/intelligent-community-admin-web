import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '../views/LoginView.vue';
import UsersView from '../views/UsersView.vue';
import AdminsView from '../views/AdminsView.vue';
import ContentView from '../views/ContentView.vue';
import MiniModuleEntryView from '../views/MiniModuleEntryView.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: LoginView, meta: { public: true } },
    { path: '/', redirect: '/users' },
    { path: '/users', component: UsersView },
    { path: '/admins', component: AdminsView, meta: { superAdminOnly: true } },
    { path: '/mini-modules', component: MiniModuleEntryView, meta: { superAdminOnly: true } },
    { path: '/contents/:type', component: ContentView },
  ],
});

router.beforeEach((to) => {
  const token = localStorage.getItem('admin_token');
  if (!to.meta.public && !token) return '/login';

  const admin = localStorage.getItem('admin_user');
  const role = admin ? JSON.parse(admin).role : '';
  if (to.meta.superAdminOnly && role !== 'SUPERADMIN') return '/users';

  return true;
});
