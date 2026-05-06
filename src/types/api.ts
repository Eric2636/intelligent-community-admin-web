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
