<template>
  <div class="admin-page">
    <PageHeader
      title="接口监控"
      description="查询微信小程序和后台管理的接口调用，定位异常状态、慢请求和具体调用人。"
      :breadcrumbs="['日志中心', '接口监控']"
    />

    <div class="table-card">
      <a-tabs class="source-tabs" :active-key="filters.source" @change="switchSourceTab">
        <a-tab-pane key="MINI" tab="微信小程序" />
        <a-tab-pane key="ADMIN" tab="后台管理" />
      </a-tabs>

      <FilterPanel>
        <div class="filter-field filter-field--wide">
          <label class="filter-field__label" label="接口">接口</label>
          <a-select
            v-model:value="filters.endpointId"
            placeholder="请选择或搜索接口"
            allow-clear
            show-search
            :filter-option="filterEndpoint"
          >
            <a-select-option
              v-for="item in sourceEndpoints"
              :key="item.id"
              :value="item.id"
              :label="`${item.method} ${item.routePattern}`"
            >
              <span class="endpoint-option__method">{{ item.method }}</span>
              <span>{{ item.displayName || item.routePattern }}</span>
            </a-select-option>
          </a-select>
        </div>

        <div class="filter-field">
          <label class="filter-field__label" label="请求方法">请求方法</label>
          <a-select v-model:value="filters.method" placeholder="全部方法" allow-clear>
            <a-select-option v-for="item in methods" :key="item" :value="item">{{ item }}</a-select-option>
          </a-select>
        </div>

        <div class="filter-field">
          <label class="filter-field__label" label="响应状态">响应状态</label>
          <a-select v-model:value="statusFilter" placeholder="全部状态" allow-clear show-search>
            <a-select-opt-group label="状态类别">
              <a-select-option v-for="item in statusClasses" :key="item" :value="item">
                {{ statusClassLabel(item) }}
              </a-select-option>
            </a-select-opt-group>
            <a-select-opt-group label="常用状态码">
              <a-select-option v-for="item in commonStatuses" :key="item.code" :value="String(item.code)">
                {{ item.code }} {{ item.label }}
              </a-select-option>
            </a-select-opt-group>
          </a-select>
        </div>

        <div class="filter-field filter-field--wide">
          <label class="filter-field__label" label="调用时间">调用时间</label>
          <a-range-picker
            v-model:value="timeRange"
            show-time
            value-format="YYYY-MM-DDTHH:mm:ssZ"
            :placeholder="['开始时间', '结束时间']"
          />
        </div>

        <template #advanced>
          <div class="filter-field">
            <label class="filter-field__label" label="IP 地址">IP 地址</label>
            <a-input v-model:value="filters.ip" placeholder="请输入访问 IP" allow-clear @pressEnter="submitSearch" />
          </div>
          <div class="filter-field">
            <label class="filter-field__label" label="用户/管理员">用户/管理员</label>
            <a-input
              v-model:value="filters.actorId"
              :placeholder="filters.source === 'ADMIN' ? '请输入管理员 ID' : '请输入用户 ID'"
              allow-clear
              @pressEnter="submitSearch"
            />
          </div>
          <div class="filter-field">
            <label class="filter-field__label" label="请求耗时">请求耗时</label>
            <a-select v-model:value="durationPreset" placeholder="全部耗时" allow-clear @change="applyDurationPreset">
              <a-select-option value="fast">100ms 以内</a-select-option>
              <a-select-option value="normal">100ms～500ms</a-select-option>
              <a-select-option value="slow">500ms～1秒</a-select-option>
              <a-select-option value="verySlow">1秒以上</a-select-option>
              <a-select-option value="custom">自定义范围</a-select-option>
            </a-select>
          </div>
          <div v-if="durationPreset === 'custom'" class="filter-field">
            <label class="filter-field__label">自定义耗时（毫秒）</label>
            <a-input-group compact>
              <a-input-number v-model:value="filters.minDurationMs" placeholder="最小值" :min="0" />
              <a-input class="range-separator" value="至" disabled />
              <a-input-number v-model:value="filters.maxDurationMs" placeholder="最大值" :min="0" />
            </a-input-group>
          </div>
        </template>

        <template #actions>
          <a-button type="primary" @click="submitSearch">查询</a-button>
          <a-button @click="resetSearch">重置</a-button>
        </template>
      </FilterPanel>

      <a-alert
        v-if="loadError"
        class="load-alert"
        type="error"
        show-icon
        message="数据加载失败"
        description="旧结果已清空，请检查筛选条件或服务状态后重新加载。"
      >
        <template #action><a-button size="small" @click="load">重新加载</a-button></template>
      </a-alert>

      <TableToolbar
        :total="Number(pagination.total || 0)"
        :updated-at="lastUpdatedAt"
        :loading="loading"
        @refresh="load"
      >
        <a-button :loading="exporting" @click="exportCurrent">
          <template #icon><DownloadOutlined /></template>
          导出当前筛选结果
        </a-button>
      </TableToolbar>

      <a-table
        class="data-table"
        row-key="id"
        :loading="loading"
        :columns="columns"
        :data-source="rows"
        :pagination="pagination"
        :scroll="{ x: 1040 }"
        :sticky="{ offsetHeader: 56 }"
        :locale="{ emptyText: hasActiveFilters ? '没有符合当前筛选条件的记录' : '暂无接口调用记录' }"
        @change="onTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'source'">
            <a-tag :color="record.source === 'ADMIN' ? 'blue' : 'green'">{{ sourceLabel(record.source) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'method'">
            <span class="method-text">{{ record.method }}</span>
          </template>
          <template v-else-if="column.key === 'httpStatus'">
            <a-tag :color="statusColor(record.httpStatus)">{{ record.httpStatus }}</a-tag>
          </template>
          <template v-else-if="column.key === 'actor'">
            {{ record.actorLabel || '匿名访问' }}
          </template>
          <template v-else-if="column.key === 'requestUrl'">
            <a-tooltip :title="record.requestUrl || undefined">
              <button class="request-url" type="button" @click="openDetail(record)">
                {{ record.requestUrl || '历史记录未保存真实请求地址' }}
              </button>
            </a-tooltip>
          </template>
          <template v-else-if="column.key === 'durationMs'">
            <span :class="{ 'slow-request': record.durationMs >= 1000 }">{{ record.durationMs }} ms</span>
          </template>
          <template v-else-if="column.key === 'detail'">
            <a-button type="link" size="small" @click="openDetail(record)">查看</a-button>
          </template>
        </template>
      </a-table>
    </div>

    <a-drawer v-model:open="detailOpen" title="请求详情" width="720" destroy-on-close>
      <template v-if="detailRow">
        <a-descriptions class="request-summary" bordered :column="2" size="small">
          <a-descriptions-item label="调用时间">{{ detailRow.createdAt }}</a-descriptions-item>
          <a-descriptions-item label="请求编号">
            <span class="mono">{{ detailRow.requestId || '—' }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="来源">{{ sourceLabel(detailRow.source) }}</a-descriptions-item>
          <a-descriptions-item label="请求方法">{{ detailRow.method }}</a-descriptions-item>
          <a-descriptions-item label="响应状态">
            <a-tag :color="statusColor(detailRow.httpStatus)">{{ detailRow.httpStatus }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="业务码">{{ detailRow.businessCode ?? '—' }}</a-descriptions-item>
          <a-descriptions-item label="请求耗时">{{ detailRow.durationMs }} ms</a-descriptions-item>
          <a-descriptions-item label="访问 IP">{{ detailRow.ip || '—' }}</a-descriptions-item>
          <a-descriptions-item label="调用人">{{ detailRow.actorLabel || '匿名访问' }}</a-descriptions-item>
          <a-descriptions-item label="请求地址" :span="2">
            <div class="request-address">
              <code>{{ detailRow.requestUrl || '历史记录未保存真实请求地址' }}</code>
              <a-button
                v-if="detailRow.requestUrl"
                type="link"
                size="small"
                @click="copyRequestUrl"
              >
                复制地址
              </a-button>
            </div>
          </a-descriptions-item>
        </a-descriptions>

        <section class="detail-section">
          <h3>请求参数</h3>
          <pre class="detail-pre">{{ requestSnapshotText }}</pre>
        </section>
        <section v-if="detailRow.errorSummary" class="detail-section">
          <h3>错误信息</h3>
          <a-alert type="error" show-icon :message="detailRow.errorSummary" />
        </section>
      </template>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import type { TablePaginationConfig } from 'ant-design-vue';
import { message } from 'ant-design-vue';
import { DownloadOutlined } from '@ant-design/icons-vue';
import { errorMessage, exportApiAccessLogs, listApiAccessLogs, listApiEndpoints } from '../api/admin';
import type { ApiAccessLog, ApiEndpoint, ApiLogFilters, ApiSource, ApiStatusClass } from '../types/api';
import { formatDateTimeYmdHm } from '../utils/date';
import FilterPanel from '../components/admin/FilterPanel.vue';
import PageHeader from '../components/admin/PageHeader.vue';
import TableToolbar from '../components/admin/TableToolbar.vue';

type FilterModel = {
  ip?: string;
  endpointId?: string;
  method?: string;
  source: ApiSource;
  httpStatus?: number;
  statusClass?: ApiStatusClass;
  actorId?: string;
  minDurationMs?: number;
  maxDurationMs?: number;
};

const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const statusClasses: ApiStatusClass[] = ['2xx', '3xx', '4xx', '5xx'];
const commonStatuses = [
  { code: 200, label: '请求成功' },
  { code: 201, label: '创建成功' },
  { code: 204, label: '无响应内容' },
  { code: 301, label: '永久重定向' },
  { code: 400, label: '请求参数错误' },
  { code: 401, label: '未登录或登录失效' },
  { code: 403, label: '无访问权限' },
  { code: 404, label: '接口不存在' },
  { code: 409, label: '数据冲突' },
  { code: 422, label: '业务校验失败' },
  { code: 429, label: '请求过于频繁' },
  { code: 500, label: '服务器异常' },
  { code: 502, label: '网关异常' },
  { code: 503, label: '服务不可用' },
];
const filters = reactive<FilterModel>({ source: 'MINI' });
const statusFilter = ref<string>();
const durationPreset = ref<string>();
const timeRange = ref<string[]>([]);
const endpoints = ref<ApiEndpoint[]>([]);
const rows = ref<ApiAccessLog[]>([]);
const loading = ref(false);
const exporting = ref(false);
const loadError = ref(false);
const lastUpdatedAt = ref('');
const detailOpen = ref(false);
const detailRow = ref<ApiAccessLog | null>(null);
const pagination = reactive<TablePaginationConfig>({ current: 1, pageSize: 20, total: 0 });

const sourceEndpoints = computed(() => endpoints.value.filter((item) => item.source === filters.source));
const hasActiveFilters = computed(() => Boolean(
  filters.ip
  || filters.endpointId
  || filters.method
  || statusFilter.value
  || filters.actorId
  || durationPreset.value
  || timeRange.value.length,
));
const requestSnapshotText = computed(() => {
  if (!detailRow.value?.requestSnapshot) return '该次请求没有记录请求参数';
  return JSON.stringify(detailRow.value.requestSnapshot, null, 2);
});

const columns = [
  { title: '调用时间', dataIndex: 'createdAt', key: 'createdAt', width: 170, defaultSortOrder: 'descend' as const },
  { title: '来源', key: 'source', width: 90 },
  { title: '方法', dataIndex: 'method', key: 'method', width: 85 },
  { title: '请求地址', key: 'requestUrl', width: 460, ellipsis: true },
  { title: '状态', key: 'httpStatus', width: 90 },
  { title: '耗时', key: 'durationMs', width: 100 },
  { title: '操作', key: 'detail', width: 80, fixed: 'right' as const, align: 'center' as const },
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

function applyStatusFilter(value?: string) {
  filters.statusClass = value && statusClasses.includes(value as ApiStatusClass)
    ? value as ApiStatusClass
    : undefined;
  filters.httpStatus = value && /^\d{3}$/.test(value) ? Number(value) : undefined;
}

async function load() {
  loading.value = true;
  loadError.value = false;
  applyStatusFilter(statusFilter.value);
  try {
    const data = await listApiAccessLogs({
      ...requestFilters(),
      page: pagination.current,
      pageSize: pagination.pageSize,
    });
    rows.value = data.list.map((item) => ({ ...item, createdAt: formatDateTimeYmdHm(item.createdAt) }));
    pagination.total = data.total;
    lastUpdatedAt.value = new Date().toLocaleTimeString('zh-CN', { hour12: false });
  } catch (error) {
    rows.value = [];
    pagination.total = 0;
    loadError.value = true;
    message.error(errorMessage(error));
  } finally {
    loading.value = false;
  }
}

async function loadEndpoints() {
  try {
    const data = await listApiEndpoints({ page: 1, pageSize: 500, source: filters.source });
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
    source: filters.source,
    httpStatus: undefined,
    statusClass: undefined,
    actorId: undefined,
    minDurationMs: undefined,
    maxDurationMs: undefined,
  });
  statusFilter.value = undefined;
  timeRange.value = [];
  durationPreset.value = undefined;
  pagination.current = 1;
  load();
}

async function exportCurrent() {
  exporting.value = true;
  applyStatusFilter(statusFilter.value);
  try {
    const blob = await exportApiAccessLogs(requestFilters());
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `api-access-logs-${new Date().toISOString().slice(0, 10)}.csv`;
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

function sourceLabel(source: ApiSource) {
  return source === 'ADMIN' ? '后台管理' : '微信小程序';
}

function statusClassLabel(status: ApiStatusClass) {
  return {
    '2xx': '2xx 成功',
    '3xx': '3xx 重定向',
    '4xx': '4xx 客户端错误',
    '5xx': '5xx 服务端错误',
  }[status];
}

function statusColor(status: number) {
  if (status >= 500) return 'red';
  if (status >= 400) return 'volcano';
  if (status >= 300) return 'orange';
  return 'green';
}

function switchSourceTab(key: string | number) {
  filters.source = key === 'ADMIN' ? 'ADMIN' : 'MINI';
  filters.endpointId = undefined;
  pagination.current = 1;
  loadEndpoints();
  load();
}

function applyDurationPreset(value?: string) {
  const ranges: Record<string, [number | undefined, number | undefined]> = {
    fast: [undefined, 100],
    normal: [100, 500],
    slow: [500, 1000],
    verySlow: [1000, undefined],
  };
  if (value && value !== 'custom') {
    [filters.minDurationMs, filters.maxDurationMs] = ranges[value];
  } else if (!value) {
    [filters.minDurationMs, filters.maxDurationMs] = [undefined, undefined];
  }
}

function filterEndpoint(input: string, option: { label?: string }) {
  return String(option.label || '').toLowerCase().includes(input.toLowerCase());
}

function openDetail(record: ApiAccessLog) {
  detailRow.value = record;
  detailOpen.value = true;
}

async function copyRequestUrl() {
  const url = detailRow.value?.requestUrl;
  if (!url) return;
  try {
    await navigator.clipboard.writeText(url);
    message.success('请求地址已复制');
  } catch {
    message.warning('复制失败，请手动选择复制');
  }
}

onMounted(() => {
  loadEndpoints();
  load();
});
</script>

<style scoped>
.source-tabs {
  margin-bottom: 4px;
}

.endpoint-option__method {
  display: inline-block;
  min-width: 54px;
  margin-right: 8px;
  color: #0052d9;
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 12px;
  font-weight: 600;
}

.range-separator {
  width: 38px;
  border-inline: 0;
  pointer-events: none;
  text-align: center;
}

.filter-field :deep(.ant-input-group) {
  display: flex;
}

.filter-field :deep(.ant-input-group .ant-input-number) {
  width: calc((100% - 38px) / 2);
}

.load-alert {
  margin-bottom: 12px;
}

.request-url {
  display: block;
  max-width: 360px;
  padding: 0;
  overflow: hidden;
  border: 0;
  background: transparent;
  color: #0052d9;
  cursor: pointer;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.request-url:hover {
  text-decoration: underline;
}

.method-text {
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 12px;
  font-weight: 600;
}

.slow-request {
  color: #e34d59;
  font-weight: 600;
}

.request-address {
  display: flex;
  align-items: center;
  gap: 4px;
}

.request-address code {
  min-width: 0;
  overflow-wrap: anywhere;
}

.detail-section {
  margin-top: 24px;
}

.detail-section h3 {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 600;
}

.detail-pre {
  max-height: 360px;
  margin: 0;
  padding: 14px;
  overflow: auto;
  border-radius: 4px;
  background: #0b1020;
  color: #e6edf3;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
