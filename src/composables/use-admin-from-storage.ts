import { computed } from 'vue';
import { useRoute } from 'vue-router';
import type { AdminUser } from '../types/api';

/**
 * 从 localStorage 读取当前登录管理员。
 * 因 localStorage 不是 Vue 响应式数据源，这里依赖 route.fullPath，
 * 在登录/登出/路由切换时会重新计算，避免切换账号后仍沿用旧角色（例如菜单误判为超管）。
 */
export function useAdminFromStorage() {
  const route = useRoute();
  return computed<AdminUser | null>(() => {
    void route.fullPath;
    const raw = localStorage.getItem('admin_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AdminUser;
    } catch {
      return null;
    }
  });
}
