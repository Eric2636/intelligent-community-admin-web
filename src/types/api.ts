export type ModuleEntryTabConfig = {
  key: string;
  label: string;
  enabled: boolean;
  always: boolean;
};

export type AdminRole = 'ADMIN' | 'SUPERADMIN';
export type AdminType = 'OFFICIAL' | 'THIRD_PARTY';
export type ContentVisibility = 'ONLINE' | 'OFFLINE';

export type AdminUser = {
  id: string;
  username: string;
  role: AdminRole;
  type: AdminType;
  orgName?: string;
  /** 绑定的小程序用户 id，普通管理员仅能操作该用户发布的内容 */
  boundUserId?: string | null;
  enabled: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type MiniUser = {
  id: string;
  openid: string;
  name?: string;
  avatar?: string;
  gender: number;
  enabled: boolean;
  disabledAt?: string;
  disabledReason?: string;
  createdAt: string;
  updatedAt: string;
};

export type PageResult<T> = {
  total: number;
  list: T[];
};

export type AdminSystemLog = {
  id: string;
  adminId: string;
  adminUsername: string;
  ip: string;
  action: string;
  detail?: any;
  createdAt: string;
};

export type MiniApiErrorLog = {
  id: string;
  userId?: string | null;
  openid?: string | null;
  ip?: string | null;
  method: string;
  path: string;
  url?: string | null;
  statusCode?: number | null;
  errorMessage: string;
  requestData?: any;
  responseData?: any;
  stack?: string | null;
  platform?: string | null;
  appVersion?: string | null;
  sdkVersion?: string | null;
  system?: string | null;
  networkType?: string | null;
  createdAt: string;
};

export type ContentType = 'errands' | 'posts' | 'items' | 'tasks';

export type ContentItem = {
  id: string;
  title: string;
  content?: string;
  desc?: string;
  authorId?: string;
  authorName?: string;
  publisherId?: string;
  publisherName?: string;
  visibility: ContentVisibility;
  pinned: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type AdminUserDetail = {
  user: MiniUser & {
    birth?: string;
    address?: any;
    photos?: any;
    brief?: string;
  };
  stats: {
    errands: number;
    posts: number;
    items: number;
    tasks: number;
  };
};
