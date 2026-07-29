<template>
  <div class="admin-page">
    <PageHeader
      title="小程序异常上报"
      description="查看由微信小程序主动上报的网络、接口和客户端运行异常。"
      :breadcrumbs="['日志中心', '小程序异常上报']"
    />
    <div class="table-card">
    <FilterPanel>
      <label class="filter-field filter-field--wide">
        <span class="filter-field__label">关键词</span>
        <a-input-search v-model:value="keyword" placeholder="搜索接口、错误、用户或 IP" allow-clear @search="submitSearch" />
      </label>
      <label class="filter-field filter-field--compact">
        <span class="filter-field__label">请求方法</span>
        <a-select v-model:value="method" allow-clear placeholder="全部方法">
          <a-select-option value="GET">GET</a-select-option>
          <a-select-option value="POST">POST</a-select-option>
          <a-select-option value="PATCH">PATCH</a-select-option>
          <a-select-option value="DELETE">DELETE</a-select-option>
        </a-select>
      </label>
      <label class="filter-field filter-field--compact">
        <span class="filter-field__label">状态码</span>
        <a-input-number
          v-model:value="statusCode"
          :min="100"
          :max="599"
          placeholder="如 401"
          @pressEnter="submitStatusCodeSearch"
        />
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
      :scroll="{ x: 1180 }"
      :sticky="{ offsetHeader: 56 }"
      :locale="{ emptyText: keyword || method || statusCode ? '没有符合当前筛选条件的异常记录' : '暂无小程序异常上报' }"
      @change="onTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'statusCode'">
          <a-tag :color="statusColor(record.statusCode)">{{ record.statusCode || '网络失败' }}</a-tag>
        </template>
        <template v-else-if="column.key === 'errorMessage'">
          <span class="error-text">{{ record.errorMessage }}</span>
        </template>
        <template v-else-if="column.key === 'requestUrl'">
          <a-tooltip :title="record.url || record.path">
            <span class="request-url-text">{{ record.url || record.path || '—' }}</span>
          </a-tooltip>
        </template>
        <template v-else-if="column.key === 'detail'">
          <a-button type="link" size="small" @click="openDetail(record)">查看</a-button>
        </template>
      </template>
    </a-table>

    <a-drawer v-model:open="detailOpen" title="小程序异常详情" width="760" destroy-on-close>
      <div class="detail-head">
        <div><span class="label">时间</span>{{ detailRow?.createdAt || '-' }}</div>
        <div><span class="label">状态码</span>{{ detailRow?.statusCode || '网络失败' }}</div>
        <div><span class="label">方法</span>{{ detailRow?.method || '-' }}</div>
        <div><span class="label">IP</span>{{ detailRow?.ip || '-' }}</div>
        <div><span class="label">用户ID</span>{{ detailRow?.userId || '-' }}</div>
        <div><span class="label">网络</span>{{ detailRow?.networkType || '-' }}</div>
        <div class="detail-head__wide request-address">
          <span class="label">请求地址</span>
          <code>{{ detailRow?.url || detailRow?.path || '—' }}</code>
          <a-button v-if="detailRow?.url || detailRow?.path" type="link" size="small" @click="copyRequestUrl">复制地址</a-button>
        </div>
        <div class="detail-head__wide"><span class="label">设备</span>{{ deviceText }}</div>
      </div>
      <section class="detail-section">
        <h3>错误信息</h3>
        <a-alert type="error" show-icon :message="detailRow?.errorMessage || '未知异常'" />
      </section>
      <section class="detail-section">
        <h3>请求参数</h3>
        <pre class="detail-pre">{{ requestDataText }}</pre>
      </section>
      <section v-if="detailRow?.responseData" class="detail-section">
        <h3>响应数据</h3>
        <pre class="detail-pre">{{ responseDataText }}</pre>
      </section>
      <a-collapse ghost class="raw-detail">
        <a-collapse-panel key="raw" header="查看原始上报数据">
          <pre class="detail-pre">{{ detailText }}</pre>
        </a-collapse-panel>
      </a-collapse>
    </a-drawer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import type { TablePaginationConfig } from 'ant-design-vue';
import { message } from 'ant-design-vue';
import { errorMessage, listMiniApiErrorLogs } from '../api/admin';
import type { MiniApiErrorLog } from '../types/api';
import { formatDateTimeYmdHm } from '../utils/date';
import { submitOnPlainEnter } from '../utils/keyboard';
import { createLatestRequestRunner } from '../utils/latest-request';
import FilterPanel from '../components/admin/FilterPanel.vue';
import PageHeader from '../components/admin/PageHeader.vue';
import TableToolbar from '../components/admin/TableToolbar.vue';

const loading = ref(false);
const loadError = ref('');
const keyword = ref('');
const method = ref<string | undefined>(undefined);
const statusCode = ref<number | undefined>(undefined);
const rows = ref<MiniApiErrorLog[]>([]);
const pagination = reactive<TablePaginationConfig>({ current: 1, pageSize: 20, total: 0 });
const listRequest = createLatestRequestRunner();
const detailOpen = ref(false);
const detailRow = ref<MiniApiErrorLog | null>(null);
const detailText = ref('');

const columns = [
  { title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 170 },
  { title: '方法', dataIndex: 'method', key: 'method', width: 90 },
  { title: '状态', key: 'statusCode', width: 110 },
  { title: '请求地址', key: 'requestUrl', width: 340, ellipsis: true },
  { title: '错误信息', key: 'errorMessage', width: 280, ellipsis: true },
  { title: '用户ID', dataIndex: 'userId', key: 'userId', width: 180, ellipsis: true },
  { title: 'IP', dataIndex: 'ip', key: 'ip', width: 140 },
  { title: '详情', key: 'detail', width: 90, align: 'center' as const },
];

const deviceText = computed(() => {
  const row = detailRow.value;
  if (!row) return '-';
  return [row.platform, row.system, row.sdkVersion, row.appVersion].filter(Boolean).join(' / ') || '-';
});
const requestDataText = computed(() => stringifyValue(detailRow.value?.requestData, '该次异常没有记录请求参数'));
const responseDataText = computed(() => stringifyValue(detailRow.value?.responseData, '该次异常没有记录响应数据'));

function stringifyValue(value: unknown, emptyText: string) {
  if (value == null || value === '') return emptyText;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function statusColor(code?: number | null) {
  if (!code) return 'orange';
  if (code >= 500) return 'red';
  if (code >= 400) return 'volcano';
  return 'blue';
}

function openDetail(row: MiniApiErrorLog) {
  detailRow.value = row;
  detailText.value = JSON.stringify(
    {
      method: row.method,
      path: row.path,
      url: row.url,
      statusCode: row.statusCode,
      errorMessage: row.errorMessage,
      requestData: row.requestData,
      responseData: row.responseData,
      stack: row.stack,
      userId: row.userId,
      openid: row.openid,
      ip: row.ip,
      platform: row.platform,
      appVersion: row.appVersion,
      sdkVersion: row.sdkVersion,
      system: row.system,
      networkType: row.networkType,
      createdAt: row.createdAt,
    },
    null,
    2,
  );
  detailOpen.value = true;
}

async function copyRequestUrl() {
  const url = detailRow.value?.url || detailRow.value?.path;
  if (!url) return;
  try {
    await navigator.clipboard.writeText(url);
    message.success('请求地址已复制');
  } catch {
    message.warning('复制失败，请手动选择复制');
  }
}

async function load(deduplicate = false) {
  const params = {
    page: pagination.current,
    pageSize: pagination.pageSize,
    keyword: keyword.value || undefined,
    method: method.value || undefined,
    statusCode: statusCode.value || undefined,
  };
  await listRequest.run({
    key: JSON.stringify(params),
    deduplicate,
    request: () => listMiniApiErrorLogs(params),
    onSuccess: (data) => {
      loadError.value = '';
      rows.value = data.list.map((r) => ({ ...r, createdAt: formatDateTimeYmdHm(r.createdAt) }));
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

function submitSearch() {
  pagination.current = 1;
  load(true);
}

function submitStatusCodeSearch(event: KeyboardEvent) {
  submitOnPlainEnter(event, submitSearch, { loading: loading.value });
}

function resetSearch() {
  keyword.value = '';
  method.value = undefined;
  statusCode.value = undefined;
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
.error-text {
  display: block;
  max-width: 100%;
  overflow: hidden;
  color: #c9353f;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.detail-head {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 16px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
}
.detail-head__wide {
  grid-column: 1 / -1;
}
.detail-head .label {
  display: inline-block;
  width: 56px;
  color: rgba(0, 0, 0, 0.45);
}
.detail-pre {
  margin-top: 12px;
  padding: 12px;
  background: #0b1020;
  color: #e6edf3;
  border-radius: 8px;
  font-size: 12px;
  line-height: 1.6;
  max-height: 420px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.request-url-text {
  display: block;
  max-width: 100%;
  overflow: hidden;
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.request-address {
  display: flex;
  align-items: center;
  min-width: 0;
}

.request-address code {
  min-width: 0;
  overflow-wrap: anywhere;
}

.detail-section {
  margin-top: 20px;
}

.detail-section h3 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
}

.raw-detail {
  margin-top: 8px;
}
</style>
