export type ModuleEntryTabConfig = {
  key: string;
  label: string;
  enabled: boolean;
  always: boolean;
};

export type AdminRole = 'ADMIN' | 'SUPERADMIN';
export type AdminType = 'OFFICIAL' | 'THIRD_PARTY';
export type ContentVisibility = 'ONLINE' | 'OFFLINE';
export type BackupFrequency = 'HOURLY' | 'EVERY_6_HOURS' | 'DAILY';
export type BackupJobStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';

export type DatabaseBackupSetting = {
  id: string;
  enabled: boolean;
  frequency: BackupFrequency;
  minute: number;
  dailyHour: number;
  lastScheduledAt?: string | null;
  updatedAt: string;
};

export type DatabaseBackupJob = {
  id: string;
  triggerType: 'AUTO' | 'MANUAL';
  status: BackupJobStatus;
  environment: string;
  outputFileName?: string | null;
  outputSizeBytes?: string | null;
  errorMessage?: string | null;
  requestedByAdminId?: string | null;
  requestedByAdminUsername?: string | null;
  scheduledAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  durationMs?: number | null;
  createdAt: string;
};

export type DatabaseBackupOverview = {
  latestSuccess: DatabaseBackupJob | null;
  latestFailure: DatabaseBackupJob | null;
  activeJob: DatabaseBackupJob | null;
};

export type DatabaseTableInfo = {
  tableName: string;
  module: string;
  description: string;
  rowCount: number;
  dataBytes: number;
  indexBytes: number;
};

export type DatabaseColumnInfo = {
  columnName: string;
  columnType: string;
  nullable: 'YES' | 'NO';
  defaultValue?: unknown;
  columnKey?: string;
  extra?: string;
  comment?: string;
};

export type DatabaseIndexInfo = {
  indexName: string;
  columnName: string;
  seqInIndex: number;
  nonUnique: number;
  indexType: string;
};

export type DatabaseTableStructure = {
  tableName: string;
  module: string;
  description: string;
  columns: DatabaseColumnInfo[];
  indexes: DatabaseIndexInfo[];
};

export type MallCategory = {
  id: string;
  name: string;
  sortOrder: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

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
  contentTagLabel?: string;
  contentTagType?: 'owner' | 'outsider' | 'admin' | '';
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

export type PublishSystemNoticeResult = {
  noticeId: string;
  recipientCount: number;
};

export type AdminFeedback = {
  id: string;
  userId: string;
  nickname: string;
  avatar: string;
  identity: string;
  identityLabel: string;
  content: string;
  createdAt: string;
};

export type ApiSource = 'MINI' | 'ADMIN';
export type ApiStatusClass = '2xx' | '3xx' | '4xx' | '5xx';

export type ApiEndpoint = {
  id: string;
  source: ApiSource;
  method: string;
  routePattern: string;
  description?: string | null;
  moduleName?: string;
  displayName?: string;
  defaultDescription?: string;
  stats?: { calls: number; errors: number; lastCalledAt?: string | null };
  logEnabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ApiLogFilters = {
  page?: number;
  pageSize?: number;
  ip?: string;
  endpointId?: string;
  method?: string;
  source?: ApiSource;
  httpStatus?: number;
  statusClass?: ApiStatusClass;
  startAt?: string;
  endAt?: string;
  actorId?: string;
  minDurationMs?: number;
  maxDurationMs?: number;
};

export type ApiRequestLog = {
  id: string;
  requestId: string;
  endpointId?: string | null;
  source: ApiSource;
  method: string;
  routePattern: string;
  requestUrl?: string | null;
  ip?: string | null;
  userId?: string | null;
  adminId?: string | null;
  actorLabel?: string;
  httpStatus: number;
  businessCode?: number | null;
  errorCode?: string | null;
  errorSummary?: string | null;
  requestSnapshot?: Record<string, unknown> | null;
  durationMs: number;
  createdAt: string;
};

export type ApiAccessLog = ApiRequestLog;

export type ApiErrorLog = ApiRequestLog;

export type AdminSystemLog = {
  id: string;
  adminId: string;
  adminUsername: string;
  ip: string;
  action: string;
  moduleKey?: string | null;
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

export type ContentType = 'posts' | 'items' | 'tasks';

export type ContentItem = {
  id: string;
  title: string;
  content?: string;
  desc?: string;
  postType?: 'NORMAL' | 'ANNOUNCEMENT';
  validUntil?: string | null;
  authorId?: string;
  authorName?: string;
  publisherId?: string;
  publisherName?: string;
  locationName?: string;
  locationAddress?: string;
  latitude?: number | null;
  longitude?: number | null;
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
    posts: number;
    items: number;
    tasks: number;
  };
};
