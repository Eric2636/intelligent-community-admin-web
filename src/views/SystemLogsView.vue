<template>
  <div class="admin-page">
    <PageHeader
      title="操作审计"
      description="追踪管理员对业务数据的新增、修改、删除和关键状态变更。"
      :breadcrumbs="['日志中心', '操作审计']"
    />
    <div class="table-card">
    <FilterPanel>
      <label class="filter-field filter-field--wide">
        <span class="filter-field__label">关键词</span>
        <a-input-search v-model:value="keyword" placeholder="搜索管理员、动作或 IP" allow-clear @search="submitSearch" />
      </label>
      <label class="filter-field">
        <span class="filter-field__label">操作类型</span>
        <a-select v-model:value="action" allow-clear placeholder="全部操作">
          <a-select-option v-for="item in actionOptions" :key="item.value" :value="item.value">{{ item.label }}</a-select-option>
        </a-select>
      </label>
      <template #actions>
        <a-button type="primary" @click="submitSearch">查询</a-button>
        <a-button @click="resetSearch">重置</a-button>
      </template>
    </FilterPanel>

    <a-alert v-if="loadError" class="load-alert" type="error" show-icon :message="loadError">
      <template #action><a-button size="small" @click="load()">重新加载</a-button></template>
    </a-alert>
    <TableToolbar :total="Number(pagination.total || 0)" :loading="loading" @refresh="load()" />
    <a-table
      class="data-table"
      size="middle"
      row-key="id"
      :loading="loading"
      :columns="columns"
      :data-source="rows"
      :pagination="pagination"
      :scroll="{ x: 980 }"
      :sticky="{ offsetHeader: 56 }"
      :locale="{ emptyText: keyword || action ? '没有符合当前筛选条件的审计记录' : '暂无操作审计记录' }"
      @change="onTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'createdAt'">
          {{ formatDateTimeYmdHm(record.createdAt) }}
        </template>
        <template v-else-if="column.key === 'module'">
          {{ moduleLabel(record) }}
        </template>
        <template v-else-if="column.key === 'subject'">
          <a-tooltip :title="subjectLabel(record)">
            <span class="table-cell-ellipsis">{{ subjectLabel(record) }}</span>
          </a-tooltip>
        </template>
        <template v-else-if="column.key === 'result'">
          <a-tag :color="resultLabel(record) === '成功' ? 'green' : 'red'">{{ resultLabel(record) }}</a-tag>
        </template>
        <template v-else-if="column.key === 'detail'">
          <a-button
            v-if="hasDetail(record.detail)"
            type="link"
            size="small"
            @click="openDetail(record)"
          >
            查看
          </a-button>
          <span v-else class="detail-empty">—</span>
        </template>
        <template v-else-if="column.key === 'action'">
          {{ actionLabel(record.action) }}
        </template>
      </template>
    </a-table>

    <a-drawer v-model:open="detailOpen" title="操作审计详情" width="760" destroy-on-close>
      <div class="detail-head">
        <div><span class="label">时间</span>{{ detailRow?.createdAt ? formatDateTimeYmdHm(detailRow.createdAt) : '-' }}</div>
        <div><span class="label">管理员</span>{{ detailRow?.adminUsername || '-' }}</div>
        <div><span class="label">IP</span>{{ detailRow?.ip || '-' }}</div>
        <div><span class="label">动作</span>{{ detailRow ? actionLabel(detailRow.action) : '-' }}</div>
        <div><span class="label">业务模块</span>{{ detailRow ? moduleLabel(detailRow) : '—' }}</div>
        <div><span class="label">执行结果</span>{{ detailRow ? resultLabel(detailRow) : '—' }}</div>
        <div class="detail-address"><span class="label">业务对象</span>{{ detailRow ? subjectLabel(detailRow) : '—' }}</div>
        <div v-if="requestAddress" class="detail-address">
          <span class="label">请求地址</span>
          <code>{{ requestAddress }}</code>
          <a-button type="link" size="small" @click="copyAddress">复制地址</a-button>
        </div>
      </div>
      <div class="audit-summary">{{ operationSummary }}</div>
      <section v-if="requestParamsText" class="audit-detail-section">
        <h3>请求参数</h3>
        <pre class="detail-pre">{{ requestParamsText }}</pre>
      </section>
      <div v-if="beforeText || afterText" class="audit-change-grid">
        <section class="audit-detail-section">
          <h3>修改前</h3>
          <pre class="detail-pre">{{ beforeText || '未记录' }}</pre>
        </section>
        <section class="audit-detail-section">
          <h3>修改后</h3>
          <pre class="detail-pre">{{ afterText || '未记录' }}</pre>
        </section>
      </div>
      <a-collapse ghost class="audit-raw-data">
        <a-collapse-panel key="raw" header="查看原始审计数据">
          <pre class="detail-pre">{{ detailText }}</pre>
        </a-collapse-panel>
      </a-collapse>
    </a-drawer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue';
import { computed } from 'vue';
import type { TablePaginationConfig } from 'ant-design-vue';
import { message } from 'ant-design-vue';
import { errorMessage, listSystemLogs } from '../api/admin';
import { formatDateTimeYmdHm } from '../utils/date';
import { createLatestRequestRunner } from '../utils/latest-request';
import type { AdminSystemLog } from '../types/api';
import FilterPanel from '../components/admin/FilterPanel.vue';
import PageHeader from '../components/admin/PageHeader.vue';
import TableToolbar from '../components/admin/TableToolbar.vue';

const loading = ref(false);
const loadError = ref('');
const keyword = ref('');
const action = ref<string | undefined>(undefined);
const rows = ref<AdminSystemLog[]>([]);
const pagination = reactive<TablePaginationConfig>({ current: 1, pageSize: 20, total: 0 });
const listRequest = createLatestRequestRunner();
const detailOpen = ref(false);
const detailRow = ref<AdminSystemLog | null>(null);
const detailText = ref('');
const requestAddress = computed(() => {
  const detail = detailRow.value?.detail;
  if (!detail || typeof detail !== 'object' || Array.isArray(detail)) return '';
  const value = (detail as Record<string, unknown>).requestUrl ?? (detail as Record<string, unknown>).requestPath ?? (detail as Record<string, unknown>).path;
  return typeof value === 'string' && /^https?:\/\//i.test(value) ? value : '';
});
const detailData = computed<Record<string, unknown>>(() => {
  const detail = detailRow.value?.detail;
  return detail && typeof detail === 'object' && !Array.isArray(detail)
    ? detail as Record<string, unknown>
    : {};
});
const requestParamsText = computed(() => stringifyDetailValue(
  detailData.value.requestParams ?? detailData.value.params ?? detailData.value.body,
));
const beforeText = computed(() => stringifyDetailValue(
  detailData.value.before ?? detailData.value.oldValue ?? detailData.value.previous,
));
const afterText = computed(() => stringifyDetailValue(
  detailData.value.after ?? detailData.value.newValue ?? detailData.value.current,
));
const operationSummary = computed(() => {
  const row = detailRow.value;
  if (!row) return '';
  const detail = detailData.value;
  const subject = [
    detail.title,
    detail.name,
    detail.username,
    detail.contentTitle,
    detail.contentId,
    detail.endpointName,
    detail.routePattern,
  ].find((value) => typeof value === 'string' && value.trim());
  return `${row.adminUsername || '管理员'} 执行了“${actionLabel(row.action)}”${subject ? `，对象：${subject}` : ''}。`;
});

const actionLabels: Record<string, string> = {
  LOGIN: '管理员登录',
  USER_ENABLED_UPDATE: '更新用户启用状态',
  ADMIN_CREATE: '创建管理员',
  ADMIN_UPDATE: '更新管理员',
  ADMIN_DELETE: '删除管理员',
  ADMIN_RESET_PASSWORD: '重置管理员密码',
  ADMIN_UNLOCK_LOGIN: '解除管理员登录锁定',
  API_ENDPOINT_DESCRIPTION_UPDATE: '修改接口用途说明',
  API_ENDPOINT_LOGGING_UPDATE: '修改接口日志开关',
  SYSTEM_NOTICE_PUBLISH: '发布系统通知',
  CONTENT_PIN_UPDATE: '修改内容置顶状态',
  CONTENT_VISIBILITY_UPDATE: '修改内容上下架状态',
  CONTENT_BATCH_STATE_UPDATE: '批量修改内容状态',
  DATABASE_BACKUP_SETTING_UPDATE: '修改数据库备份设置',
  DATABASE_BACKUP_MANUAL_CREATE: '创建手动数据库备份',
  ADMIN_DATA_MUTATION: '修改后台数据',
};
const actionOptions = Object.entries(actionLabels).map(([value, label]) => ({ value, label }));

const columns = [
  { title: '时间', key: 'createdAt', width: 160 },
  { title: '管理员', dataIndex: 'adminUsername', key: 'adminUsername', width: 110, ellipsis: true },
  { title: '业务模块', key: 'module', width: 110 },
  { title: '操作', key: 'action', width: 170, ellipsis: true },
  { title: '业务对象', key: 'subject', width: 180, ellipsis: true },
  { title: '执行结果', key: 'result', width: 90, align: 'center' as const },
  { title: '详情', key: 'detail', width: 88, fixed: 'right' as const, align: 'center' as const },
];

const moduleLabels: Record<string, string> = {
  users: '用户管理',
  admins: '管理员管理',
  posts: '小区留言',
  items: '小区市场',
  tasks: '业主互助',
  notices: '系统通知',
  api: '接口日志设置',
  database: '数据库管理',
};

function detailRecord(row: AdminSystemLog): Record<string, unknown> {
  return row.detail && typeof row.detail === 'object' && !Array.isArray(row.detail)
    ? row.detail as Record<string, unknown>
    : {};
}

function moduleLabel(row: AdminSystemLog) {
  const detail = detailRecord(row);
  const key = String(row.moduleKey || detail.module || '').trim();
  return moduleLabels[key] || key || '系统管理';
}

function subjectLabel(row: AdminSystemLog) {
  const detail = detailRecord(row);
  const value = [
    detail.title,
    detail.name,
    detail.username,
    detail.contentTitle,
    detail.endpointName,
    detail.contentId,
    detail.targetId,
    detail.id,
  ].find((item) => typeof item === 'string' && item.trim());
  return typeof value === 'string' ? value : '—';
}

function resultLabel(row: AdminSystemLog) {
  const detail = detailRecord(row);
  return detail.success === false || ['FAILED', 'ERROR'].includes(String(detail.result || '').toUpperCase())
    ? '失败'
    : '成功';
}

function stringifyDetailValue(value: unknown) {
  if (value == null || value === '') return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function hasDetail(v: unknown) {
  if (v == null) return false;
  if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0) return false;
  if (Array.isArray(v) && v.length === 0) return false;
  if (typeof v === 'string' && v.trim() === '') return false;
  return true;
}

function actionLabel(actionCode: string) {
  return actionLabels[actionCode] || '其他后台操作';
}

function openDetail(row: AdminSystemLog) {
  detailRow.value = row;
  try {
    detailText.value = row.detail ? JSON.stringify(row.detail, null, 2) : '';
  } catch {
    detailText.value = String(row.detail ?? '');
  }
  detailOpen.value = true;
}

async function load(deduplicate = false) {
  const params = {
    page: pagination.current,
    pageSize: pagination.pageSize,
    keyword: keyword.value || undefined,
    action: action.value || undefined,
  };
  await listRequest.run({
    key: JSON.stringify(params),
    deduplicate,
    request: () => listSystemLogs(params),
    onSuccess: (data) => {
      loadError.value = '';
      rows.value = data.list;
      pagination.total = data.total;
    },
    onError: (error) => {
      rows.value = [];
      pagination.total = 0;
      loadError.value = errorMessage(error);
      message.error(loadError.value);
    },
    onLoading: (value) => {
      loading.value = value;
    },
  });
}

async function copyAddress() {
  try {
    await navigator.clipboard.writeText(requestAddress.value);
    message.success('访问地址已复制');
  } catch {
    message.warning('复制失败，请手动选择复制');
  }
}

function submitSearch() {
  pagination.current = 1;
  load(true);
}

function resetSearch() {
  keyword.value = '';
  action.value = undefined;
  pagination.current = 1;
  load(true);
}

function onTableChange(page: TablePaginationConfig) {
  pagination.current = page.current || 1;
  pagination.pageSize = page.pageSize || 20;
  load();
}

onMounted(load);
onUnmounted(listRequest.dispose);
</script>

<style scoped>
.detail-empty {
  color: rgba(0, 0, 0, 0.25);
}
.detail-head {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 16px;
  padding: 12px 12px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
}
.detail-head .label {
  display: inline-block;
  width: 56px;
  color: rgba(0, 0, 0, 0.45);
}
.detail-address {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  min-width: 0;
}
.detail-address code {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.detail-pre {
  margin: 0;
  padding: 12px;
  background: #0b1020;
  color: #e6edf3;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.6;
  max-height: 420px;
  overflow: auto;
}

.audit-summary {
  margin-top: 16px;
  padding: 12px 14px;
  border-left: 3px solid #0052d9;
  background: #f2f7ff;
  color: #1d2129;
  line-height: 22px;
}

.audit-raw-data {
  margin-top: 8px;
}

.audit-detail-section {
  min-width: 0;
  margin-top: 16px;
}

.audit-detail-section h3 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
}

.audit-change-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
</style>
