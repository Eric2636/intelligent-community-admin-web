<template>
  <div class="table-card">
    <a-tabs active-key="errors" @change="switchLogTab">
      <a-tab-pane key="access" tab="访问记录" />
      <a-tab-pane key="errors" tab="错误记录（4xx / 5xx）" />
    </a-tabs>
    <div class="api-log-filters">
      <a-input v-model:value="filters.ip" placeholder="IP" allow-clear @pressEnter="submitSearch" />
      <a-select v-model:value="filters.endpointId" placeholder="接口" allow-clear show-search :filter-option="filterEndpoint">
        <a-select-option v-for="item in endpoints" :key="item.id" :value="item.id">
          {{ item.method }} {{ item.routePattern }}
        </a-select-option>
      </a-select>
      <a-select v-model:value="filters.method" placeholder="方法" allow-clear>
        <a-select-option v-for="item in methods" :key="item" :value="item">{{ item }}</a-select-option>
      </a-select>
      <a-select v-model:value="filters.source" placeholder="来源" allow-clear>
        <a-select-option value="MINI">小程序</a-select-option>
        <a-select-option value="ADMIN">后台</a-select-option>
      </a-select>
      <a-input-number v-model:value="filters.httpStatus" placeholder="状态码" :min="100" :max="599" @pressEnter="submitSearch" />
      <a-select v-model:value="filters.statusClass" placeholder="状态类别" allow-clear>
        <a-select-option v-for="item in statusClasses" :key="item" :value="item">{{ item }}</a-select-option>
      </a-select>
      <a-range-picker v-model:value="timeRange" show-time value-format="YYYY-MM-DDTHH:mm:ssZ" :placeholder="['调用时间起', '调用时间止']" />
      <a-input v-model:value="filters.actorId" placeholder="用户/管理员 ID" allow-clear @pressEnter="submitSearch" />
      <a-input-number v-model:value="filters.minDurationMs" placeholder="最小耗时(ms)" :min="0" @pressEnter="submitSearch" />
      <a-input-number v-model:value="filters.maxDurationMs" placeholder="最大耗时(ms)" :min="0" @pressEnter="submitSearch" />
      <div class="filter-actions">
        <a-button type="primary" @click="submitSearch">查询</a-button>
        <a-button @click="resetSearch">重置</a-button>
        <a-button :loading="exporting" @click="exportCurrent">导出当前筛选结果</a-button>
      </div>
    </div>

    <a-table
      row-key="id"
      :loading="loading"
      :columns="columns"
      :data-source="rows"
      :pagination="pagination"
      :scroll="{ x: 1300 }"
      @change="onTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'source'">
          <a-tag :color="record.source === 'ADMIN' ? 'blue' : 'green'">{{ sourceLabel(record.source) }}</a-tag>
        </template>
        <template v-else-if="column.key === 'httpStatus'">
          <a-tag :color="record.httpStatus >= 500 ? 'red' : 'orange'">{{ record.httpStatus }}</a-tag>
        </template>
        <template v-else-if="column.key === 'actor'">
          {{ record.actorLabel || '匿名访问' }}
        </template>
        <template v-else-if="column.key === 'detail'">
          <a-button type="link" size="small" @click="openDetail(record)">查看</a-button>
        </template>
      </template>
    </a-table>

    <a-modal v-model:open="detailOpen" title="错误详情" :footer="null" width="720px" destroy-on-close>
      <a-descriptions bordered :column="2" size="small">
        <a-descriptions-item label="方法">{{ detailRow?.method || '—' }}</a-descriptions-item>
        <a-descriptions-item label="状态">{{ detailRow?.httpStatus || '—' }}</a-descriptions-item>
        <a-descriptions-item label="标准路由" :span="2">{{ detailRow?.routePattern || '—' }}</a-descriptions-item>
        <a-descriptions-item label="错误代码">{{ detailRow?.errorCode || '—' }}</a-descriptions-item>
        <a-descriptions-item label="耗时">{{ detailRow ? `${detailRow.durationMs} ms` : '—' }}</a-descriptions-item>
        <a-descriptions-item label="脱敏错误摘要" :span="2">
          <pre class="summary">{{ detailRow?.errorSummary || '—' }}</pre>
        </a-descriptions-item>
        <a-descriptions-item label="请求参数（已脱敏）" :span="2">
          <pre class="summary">{{ formatRequestSnapshot(detailRow?.requestSnapshot) }}</pre>
        </a-descriptions-item>
      </a-descriptions>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import type { TablePaginationConfig } from 'ant-design-vue';
import { message } from 'ant-design-vue';
import { errorMessage, exportApiErrorLogs, listApiEndpoints, listApiErrorLogs } from '../api/admin';
import type { ApiEndpoint, ApiErrorLog, ApiLogFilters, ApiSource, ApiStatusClass } from '../types/api';
import { formatDateTimeYmdHm } from '../utils/date';
import { router } from '../router';

type FilterModel = {
  ip?: string;
  endpointId?: string;
  method?: string;
  source?: ApiSource;
  httpStatus?: number;
  statusClass?: ApiStatusClass;
  actorId?: string;
  minDurationMs?: number;
  maxDurationMs?: number;
};

const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const statusClasses: ApiStatusClass[] = ['4xx', '5xx'];
const filters = reactive<FilterModel>({});
const timeRange = ref<string[]>([]);
const endpoints = ref<ApiEndpoint[]>([]);
const rows = ref<ApiErrorLog[]>([]);
const loading = ref(false);
const exporting = ref(false);
const detailOpen = ref(false);
const detailRow = ref<ApiErrorLog | null>(null);
const pagination = reactive<TablePaginationConfig>({ current: 1, pageSize: 20, total: 0 });

const columns = [
  { title: '调用时间', dataIndex: 'createdAt', key: 'createdAt', width: 170, defaultSortOrder: 'descend' as const },
  { title: '来源', key: 'source', width: 90 },
  { title: '方法', dataIndex: 'method', key: 'method', width: 85 },
  { title: '标准路由', dataIndex: 'routePattern', key: 'routePattern', width: 260, ellipsis: true },
  { title: '状态', key: 'httpStatus', width: 90 },
  { title: '错误代码', dataIndex: 'errorCode', key: 'errorCode', width: 150, ellipsis: true },
  { title: '脱敏错误摘要', dataIndex: 'errorSummary', key: 'errorSummary', width: 280, ellipsis: true },
  { title: '用户/管理员', key: 'actor', width: 180, ellipsis: true },
  { title: 'IP', dataIndex: 'ip', key: 'ip', width: 140 },
  { title: '耗时(ms)', dataIndex: 'durationMs', key: 'durationMs', width: 100 },
  { title: '详情', key: 'detail', width: 80, fixed: 'right' as const },
];

function requestFilters(): Omit<ApiLogFilters, 'page' | 'pageSize'> {
  return {
    ip: filters.ip?.trim() || undefined,
    endpointId: filters.endpointId,
    method: filters.method,
    source: filters.source,
    httpStatus: filters.httpStatus,
    statusClass: filters.statusClass,
    startAt: timeRange.value?.[0],
    endAt: timeRange.value?.[1],
    actorId: filters.actorId?.trim() || undefined,
    minDurationMs: filters.minDurationMs,
    maxDurationMs: filters.maxDurationMs,
  };
}

async function load() {
  loading.value = true;
  try {
    const data = await listApiErrorLogs({
      ...requestFilters(),
      page: pagination.current,
      pageSize: pagination.pageSize,
    });
    rows.value = data.list.map((item) => ({ ...item, createdAt: formatDateTimeYmdHm(item.createdAt) }));
    pagination.total = data.total;
  } catch (error) {
    message.error(errorMessage(error));
  } finally {
    loading.value = false;
  }
}

async function loadEndpoints() {
  try {
    const data = await listApiEndpoints({ page: 1, pageSize: 100 });
    endpoints.value = data.list;
  } catch {
    endpoints.value = [];
  }
}

function submitSearch() {
  pagination.current = 1;
  load();
}

function resetSearch() {
  Object.assign(filters, {
    ip: undefined,
    endpointId: undefined,
    method: undefined,
    source: undefined,
    httpStatus: undefined,
    statusClass: undefined,
    actorId: undefined,
    minDurationMs: undefined,
    maxDurationMs: undefined,
  });
  timeRange.value = [];
  pagination.current = 1;
  load();
}

async function exportCurrent() {
  exporting.value = true;
  try {
    const blob = await exportApiErrorLogs(requestFilters());
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `api-error-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    message.error(errorMessage(error));
  } finally {
    exporting.value = false;
  }
}

function onTableChange(page: TablePaginationConfig) {
  pagination.current = page.current || 1;
  pagination.pageSize = page.pageSize || 20;
  load();
}

function openDetail(row: ApiErrorLog) {
  detailRow.value = row;
  detailOpen.value = true;
}

function formatRequestSnapshot(snapshot?: Record<string, unknown> | null) {
  return snapshot ? JSON.stringify(snapshot, null, 2) : '历史记录未采集请求参数';
}

function sourceLabel(source: ApiSource) {
  return source === 'ADMIN' ? '后台' : '小程序';
}

function switchLogTab(key: string | number) {
  if (key === 'access') void router.push('/api-access-logs');
}

function filterEndpoint(input: string, option: { label?: string; value?: string }) {
  const endpoint = endpoints.value.find((item) => item.id === option.value);
  return endpoint ? `${endpoint.method} ${endpoint.routePattern}`.toLowerCase().includes(input.toLowerCase()) : false;
}

onMounted(() => {
  loadEndpoints();
  load();
});
</script>

<style scoped>
.api-log-filters {
  display: grid;
  grid-template-columns: repeat(5, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}
.filter-actions {
  grid-column: 1 / -1;
  display: flex;
  gap: 8px;
}
.summary {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
}
@media (max-width: 1200px) {
  .api-log-filters {
    grid-template-columns: repeat(3, minmax(150px, 1fr));
  }
}
</style>
