import axios from 'axios';
import type {
  AdminType,
  AdminUser,
  AdminUserDetail,
  ContentItem,
  ContentType,
  ContentVisibility,
  MiniUser,
  ModuleEntryTabConfig,
  PageResult,
} from '../types/api';

const http = axios.create({ baseURL: '' });

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('admin_token');
      if (location.pathname !== '/login') location.href = '/login';
    }
    return Promise.reject(error);
  },
);

function unwrap<T>(res: { data: { code?: number; data?: T } | T }): T {
  const payload = res.data;
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data as T;
  }
  return payload as T;
}

export async function login(data: { username: string; password: string }) {
  return unwrap<{ token: string; admin: AdminUser }>(await http.post('/api/admin/auth/login', data));
}

export async function getCurrentAdmin() {
  return unwrap<AdminUser>(await http.get('/api/admin/auth/me'));
}

export async function listUsers(params: { page?: number; pageSize?: number; keyword?: string }) {
  return unwrap<PageResult<MiniUser>>(await http.get('/api/admin/users', { params }));
}

export async function updateUserEnabled(userId: string, data: { enabled: boolean; reason?: string }) {
  return unwrap(await http.patch(`/api/admin/users/${userId}/enabled`, data));
}

export async function getUserDetail(userId: string) {
  return unwrap<AdminUserDetail>(await http.get(`/api/admin/users/${userId}`));
}

export async function listAdmins(params: { page?: number; pageSize?: number; keyword?: string }) {
  return unwrap<PageResult<AdminUser>>(await http.get('/api/admin/admin-users', { params }));
}

export async function createAdmin(data: { username: string; password: string; type?: AdminType; orgName?: string }) {
  return unwrap<AdminUser>(await http.post('/api/admin/admin-users', data));
}

export async function updateAdmin(
  adminId: string,
  data: { enabled?: boolean; password?: string; type?: AdminType; orgName?: string },
) {
  return unwrap<AdminUser>(await http.patch(`/api/admin/admin-users/${adminId}`, data));
}

export async function listContents(
  type: ContentType,
  params: { page?: number; pageSize?: number; keyword?: string; visibility?: ContentVisibility },
) {
  return unwrap<PageResult<ContentItem>>(await http.get(`/api/admin/contents/${type}`, { params }));
}

export async function updateContentState(
  type: ContentType,
  id: string,
  data: { visibility?: ContentVisibility; pinned?: boolean },
) {
  return unwrap(await http.patch(`/api/admin/contents/${type}/${id}/state`, data));
}

export async function getContentDetail(type: ContentType, id: string) {
  return unwrap<any>(await http.get(`/api/admin/contents/${type}/${id}`));
}

export async function batchUpdateContentState(
  type: ContentType,
  data: { ids: string[]; visibility?: ContentVisibility; pinned?: boolean },
) {
  return unwrap(await http.patch(`/api/admin/contents/${type}/state/batch`, data));
}

export async function listModuleEntryTabsAdmin() {
  return unwrap<{ tabs: ModuleEntryTabConfig[] }>(
    await http.get('/api/admin/app-settings/module-entry-tabs'),
  );
}

export async function setModuleEntryTabEnabled(key: string, enabled: boolean) {
  return unwrap<{ tabs: ModuleEntryTabConfig[] }>(
    await http.patch(`/api/admin/app-settings/module-entry-tabs/${encodeURIComponent(key)}`, { enabled }),
  );
}

export function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message;
  }
  return error instanceof Error ? error.message : '操作失败';
}
