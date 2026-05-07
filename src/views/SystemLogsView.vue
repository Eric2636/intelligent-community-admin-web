<template>
  <div class="table-card">
    <div class="toolbar">
      <a-input-search v-model:value="keyword" placeholder="搜索管理员/动作/IP" style="width: 320px" @search="load" />
      <a-select v-model:value="action" style="width: 200px" allow-clear placeholder="动作筛选" @change="load">
        <a-select-option value="LOGIN">LOGIN</a-select-option>
        <a-select-option value="USER_ENABLED_UPDATE">USER_ENABLED_UPDATE</a-select-option>
        <a-select-option value="ADMIN_CREATE">ADMIN_CREATE</a-select-option>
        <a-select-option value="ADMIN_UPDATE">ADMIN_UPDATE</a-select-option>
        <a-select-option value="ADMIN_DELETE">ADMIN_DELETE</a-select-option>
        <a-select-option value="ADMIN_RESET_PASSWORD">ADMIN_RESET_PASSWORD</a-select-option>
        <a-select-option value="ADMIN_UNLOCK_LOGIN">ADMIN_UNLOCK_LOGIN</a-select-option>
      </a-select>
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
      :scroll="{ x: 900 }"
      @change="onTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'detail'">
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
      </template>
    </a-table>

    <a-modal v-model:open="detailOpen" title="日志详情" :footer="null" width="720px" destroy-on-close>
      <div class="detail-head">
        <div><span class="label">时间</span>{{ detailRow?.createdAt || '-' }}</div>
        <div><span class="label">管理员</span>{{ detailRow?.adminUsername || '-' }}</div>
        <div><span class="label">IP</span>{{ detailRow?.ip || '-' }}</div>
        <div><span class="label">动作</span>{{ detailRow?.action || '-' }}</div>
      </div>
      <pre class="detail-pre">{{ detailText }}</pre>
      <div style="text-align: right; margin-top: 12px">
        <a-button @click="copyDetail">复制</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import type { TablePaginationConfig } from 'ant-design-vue';
import { message } from 'ant-design-vue';
import { errorMessage, listSystemLogs } from '../api/admin';
import { formatDateTimeYmdHm } from '../utils/date';
import type { AdminSystemLog } from '../types/api';

const loading = ref(false);
const keyword = ref('');
const action = ref<string | undefined>(undefined);
const rows = ref<AdminSystemLog[]>([]);
const pagination = reactive<TablePaginationConfig>({ current: 1, pageSize: 20, total: 0 });
const detailOpen = ref(false);
const detailRow = ref<AdminSystemLog | null>(null);
const detailText = ref('');

const columns = [
  { title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 170 },
  { title: '管理员', dataIndex: 'adminUsername', key: 'adminUsername', width: 140, ellipsis: true },
  { title: 'IP', dataIndex: 'ip', key: 'ip', width: 140 },
  { title: '动作', dataIndex: 'action', key: 'action', width: 220, ellipsis: true },
  { title: '详情', key: 'detail', width: 100, align: 'center' as const },
];

function hasDetail(v: unknown) {
  if (v == null) return false;
  if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0) return false;
  if (Array.isArray(v) && v.length === 0) return false;
  if (typeof v === 'string' && v.trim() === '') return false;
  return true;
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
    const data = await listSystemLogs({
      page: pagination.current,
      pageSize: pagination.pageSize,
      keyword: keyword.value || undefined,
      action: action.value || undefined,
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

