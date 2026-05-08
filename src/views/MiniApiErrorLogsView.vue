<template>
  <div class="table-card">
    <div class="toolbar">
      <a-input-search v-model:value="keyword" placeholder="搜索接口/错误/用户/IP" style="width: 320px" @search="load" />
      <a-select v-model:value="method" style="width: 140px" allow-clear placeholder="请求方法" @change="load">
        <a-select-option value="GET">GET</a-select-option>
        <a-select-option value="POST">POST</a-select-option>
        <a-select-option value="PATCH">PATCH</a-select-option>
        <a-select-option value="DELETE">DELETE</a-select-option>
      </a-select>
      <a-input-number v-model:value="statusCode" placeholder="状态码" style="width: 120px" @pressEnter="load" />
      <a-button @click="load">刷新</a-button>
    </div>

    <a-table
      class="data-table"
      size="middle"
      row-key="id"
      :loading="loading"
      :columns="columns"
      :data-source="rows"
      :pagination="pagination"
      :scroll="{ x: 1180 }"
      @change="onTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'statusCode'">
          <a-tag :color="statusColor(record.statusCode)">{{ record.statusCode || '网络失败' }}</a-tag>
        </template>
        <template v-else-if="column.key === 'errorMessage'">
          <span class="error-text">{{ record.errorMessage }}</span>
        </template>
        <template v-else-if="column.key === 'detail'">
          <a-button type="link" size="small" @click="openDetail(record)">查看</a-button>
        </template>
      </template>
    </a-table>

    <a-modal v-model:open="detailOpen" title="接口错误详情" :footer="null" width="780px" destroy-on-close>
      <div class="detail-head">
        <div><span class="label">时间</span>{{ detailRow?.createdAt || '-' }}</div>
        <div><span class="label">状态码</span>{{ detailRow?.statusCode || '网络失败' }}</div>
        <div><span class="label">方法</span>{{ detailRow?.method || '-' }}</div>
        <div><span class="label">IP</span>{{ detailRow?.ip || '-' }}</div>
        <div><span class="label">用户ID</span>{{ detailRow?.userId || '-' }}</div>
        <div><span class="label">网络</span>{{ detailRow?.networkType || '-' }}</div>
        <div class="detail-head__wide"><span class="label">接口</span>{{ detailRow?.path || '-' }}</div>
        <div class="detail-head__wide"><span class="label">设备</span>{{ deviceText }}</div>
      </div>
      <pre class="detail-pre">{{ detailText }}</pre>
      <div style="text-align: right; margin-top: 12px">
        <a-button @click="copyDetail">复制</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import type { TablePaginationConfig } from 'ant-design-vue';
import { message } from 'ant-design-vue';
import { errorMessage, listMiniApiErrorLogs } from '../api/admin';
import type { MiniApiErrorLog } from '../types/api';
import { formatDateTimeYmdHm } from '../utils/date';

const loading = ref(false);
const keyword = ref('');
const method = ref<string | undefined>(undefined);
const statusCode = ref<number | undefined>(undefined);
const rows = ref<MiniApiErrorLog[]>([]);
const pagination = reactive<TablePaginationConfig>({ current: 1, pageSize: 20, total: 0 });
const detailOpen = ref(false);
const detailRow = ref<MiniApiErrorLog | null>(null);
const detailText = ref('');

const columns = [
  { title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 170 },
  { title: '方法', dataIndex: 'method', key: 'method', width: 90 },
  { title: '状态', key: 'statusCode', width: 110 },
  { title: '接口', dataIndex: 'path', key: 'path', width: 280, ellipsis: true },
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

async function copyDetail() {
  try {
    await navigator.clipboard.writeText(detailText.value || '');
    message.success('已复制');
  } catch {
    message.warning('复制失败，请手动选择复制');
  }
}

async function load() {
  loading.value = true;
  try {
    const data = await listMiniApiErrorLogs({
      page: pagination.current,
      pageSize: pagination.pageSize,
      keyword: keyword.value || undefined,
      method: method.value || undefined,
      statusCode: statusCode.value || undefined,
    });
    rows.value = data.list.map((r) => ({ ...r, createdAt: formatDateTimeYmdHm(r.createdAt) }));
    pagination.total = data.total;
  } catch (e) {
    message.error(errorMessage(e));
  } finally {
    loading.value = false;
  }
}

function onTableChange(page: TablePaginationConfig) {
  pagination.current = page.current || 1;
  pagination.pageSize = page.pageSize || 20;
  load();
}

onMounted(load);
</script>

<style scoped>
.error-text {
  color: #c9353f;
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
}
</style>
