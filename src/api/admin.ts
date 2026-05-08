import axios from 'axios';
import type {
  AdminType,
  AdminSystemLog,
  AdminUser,
  AdminUserDetail,
  ContentItem,
  ContentType,
  ContentVisibility,
  MiniApiErrorLog,
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

export async function getLoginCaptcha() {
  return unwrap<{ captchaId: string; svg: string }>(await http.get('/api/admin/auth/captcha'));
}

export async function getCurrentAdmin() {
  return unwrap<AdminUser>(await http.get('/api/admin/auth/me'));
}

export async function changeMyPassword(password: string) {
  return unwrap<{ ok: boolean }>(await http.post('/api/admin/auth/change-password', { password }));
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

export async function listUsersMiniByIds(ids: string[]) {
  const raw = (ids || []).map((x) => String(x).trim()).filter(Boolean);
  const qs = raw.join(',');
  return unwrap<Array<{ id: string; name: string; openid: string }>>(
    await http.get('/api/admin/users-mini', { params: { ids: qs } }),
  );
}

export async function listAdmins(params: { page?: number; pageSize?: number; keyword?: string }) {
  return unwrap<PageResult<AdminUser>>(await http.get('/api/admin/admin-users', { params }));
}

export async function createAdmin(data: {
  username: string;
  password: string;
  type?: AdminType;
  orgName?: string;
}) {
  return unwrap<AdminUser>(await http.post('/api/admin/admin-users', data));
}

export async function updateAdmin(
  adminId: string,
  data: {
    enabled?: boolean;
    password?: string;
    type?: AdminType;
    orgName?: string;
    boundUserId?: string;
  },
) {
  return unwrap<AdminUser>(await http.patch(`/api/admin/admin-users/${adminId}`, data));
}

export async function deleteAdmin(adminId: string) {
  return unwrap<{ id: string }>(await http.delete(`/api/admin/admin-users/${adminId}`));
}

/** 超级管理员：将其他普通管理员密码重置为随机字符串，响应中一次性返回明文密码 */
export async function superAdminResetAdminPasswordRandom(adminId: string) {
  return unwrap<{ password: string; username: string }>(
    await http.post(`/api/admin/admin-users/${adminId}/reset-password`),
  );
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

export async function createContent(type: ContentType, data: Record<string, unknown>) {
  return unwrap<any>(await http.post(`/api/admin/contents/${type}`, data));
}

export async function updateContent(type: ContentType, id: string, data: Record<string, unknown>) {
  return unwrap<any>(await http.patch(`/api/admin/contents/${type}/${id}`, data));
}

export async function deleteContent(type: ContentType, id: string) {
  return unwrap<{ id: string }>(await http.delete(`/api/admin/contents/${type}/${id}`));
}

export type AdminUploadModule = 'forum' | 'task' | 'errand' | 'mall' | 'avatar';
export type AdminUploadMediaType = 'img' | 'vid';

export async function getAdminCosCredentials(data: {
  module: AdminUploadModule;
  type: AdminUploadMediaType;
}) {
  return unwrap<{
    bucket: string;
    region: string;
    envPrefix: string;
    allowPrefix: string;
    credentials: {
      tmpSecretId: string;
      tmpSecretKey: string;
      sessionToken: string;
    };
    startTime: number;
    expiredTime: number;
  }>(await http.post('/api/admin/upload/cos/credentials', data));
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

export async function listSystemLogs(params: { page?: number; pageSize?: number; keyword?: string; action?: string }) {
  return unwrap<PageResult<AdminSystemLog>>(await http.get('/api/admin/system-logs', { params }));
}

export async function listMiniApiErrorLogs(params: {
  page?: number;
  pageSize?: number;
  keyword?: string;
  method?: string;
  statusCode?: number;
}) {
  return unwrap<PageResult<MiniApiErrorLog>>(
    await http.get('/api/admin/mini-api-error-logs', { params }),
  );
}

export function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message;
  }
  return error instanceof Error ? error.message : '操作失败';
}
