<template>
  <div class="admin-page">
    <PageHeader
      title="接口日志设置"
      description="查看接口所属模块和业务用途，并控制是否记录普通访问日志。"
      :breadcrumbs="['系统管理', '接口日志设置']"
    />
    <div class="table-card">
    <FilterPanel>
      <label class="filter-field filter-field--wide">
        <span class="filter-field__label">关键词</span>
        <a-input
          v-model:value="keyword"
          placeholder="搜索模块、接口名称、用途或路径"
          allow-clear
          @pressEnter="submitSearch"
        />
      </label>
      <label class="filter-field">
        <span class="filter-field__label">来源</span>
        <a-select v-model:value="source" placeholder="全部来源" allow-clear>
          <a-select-option value="MINI">小程序</a-select-option>
          <a-select-option value="ADMIN">后台</a-select-option>
        </a-select>
      </label>
      <template #actions>
        <a-button type="primary" @click="submitSearch">查询</a-button>
        <a-button @click="resetSearch">重置</a-button>
      </template>
    </FilterPanel>

    <TableToolbar :total="Number(pagination.total || 0)" :loading="loading" @refresh="load" />
    <a-table
      class="data-table"
      row-key="id"
      :loading="loading"
      :columns="columns"
      :data-source="rows"
      :pagination="pagination"
      :scroll="{ x: 1320 }"
      @change="onTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'source'">
          <a-tag :color="record.source === 'ADMIN' ? 'blue' : 'green'">
            {{ record.source === 'ADMIN' ? '后台' : '小程序' }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'description'">
          <span>{{ record.description || '—' }}</span>
          <a-button type="link" size="small" @click="openDescription(record)">编辑</a-button>
        </template>
        <template v-else-if="column.key === 'traffic'">
          <span>24h {{ record.stats?.calls ?? 0 }} 次 / 失败 {{ record.stats?.errors ?? 0 }} 次</span>
        </template>
        <template v-else-if="column.key === 'logEnabled'">
          <a-switch
            v-model:checked="record.logEnabled"
            checked-children="记录"
            un-checked-children="不记录"
            @change="handleLoggingChange(record, $event)"
          />
        </template>
      </template>
    </a-table>

    <a-modal
      v-model:open="descriptionOpen"
      title="编辑接口描述"
      :confirm-loading="descriptionSaving"
      destroy-on-close
      @ok="saveDescription"
    >
      <a-form layout="vertical">
        <a-form-item label="接口用途">
          <a-input :value="editingEndpoint?.routePattern" disabled />
        </a-form-item>
        <a-form-item label="描述">
          <a-textarea
            v-model:value="descriptionDraft"
            :maxlength="500"
            :rows="4"
            show-count
            placeholder="请输入接口用途说明"
          />
        </a-form-item>
      </a-form>
    </a-modal>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { Modal, message } from 'ant-design-vue';
import type { TablePaginationConfig } from 'ant-design-vue';
import { errorMessage, listApiEndpoints, updateApiEndpoint } from '../api/admin';
import type { ApiEndpoint, ApiSource } from '../types/api';
import { formatDateTimeYmdHm } from '../utils/date';
import PageHeader from '../components/admin/PageHeader.vue';
import TableToolbar from '../components/admin/TableToolbar.vue';
import FilterPanel from '../components/admin/FilterPanel.vue';

const loading = ref(false);
const keyword = ref('');
const source = ref<ApiSource>();
const rows = ref<ApiEndpoint[]>([]);
const pagination = reactive<TablePaginationConfig>({ current: 1, pageSize: 20, total: 0 });
const descriptionOpen = ref(false);
const descriptionSaving = ref(false);
const editingEndpoint = ref<ApiEndpoint | null>(null);
const descriptionDraft = ref('');

const columns = [
  { title: '业务模块', dataIndex: 'moduleName', key: 'moduleName', width: 130 },
  { title: '接口名称', dataIndex: 'displayName', key: 'displayName', width: 180, ellipsis: true },
  { title: '来源', key: 'source', width: 90 },
  { title: '方法', dataIndex: 'method', key: 'method', width: 90 },
  { title: '标准路径', dataIndex: 'routePattern', key: 'routePattern', width: 260, ellipsis: true },
  { title: '用途说明', key: 'description', width: 300, ellipsis: true },
  { title: '日志开关', key: 'logEnabled', width: 130, align: 'center' as const },
  { title: '近 24 小时', key: 'traffic', width: 180 },
  { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', width: 170 },
];

async function load() {
  loading.value = true;
  try {
    const data = await listApiEndpoints({
      page: pagination.current,
      pageSize: pagination.pageSize,
      keyword: keyword.value.trim() || undefined,
      source: source.value,
    });
    rows.value = data.list.map((item) => ({
      ...item,
      logEnabled: item.logEnabled !== false,
      updatedAt: formatDateTimeYmdHm(item.updatedAt),
    }));
    pagination.total = data.total;
  } catch (error) {
    message.error(errorMessage(error));
  } finally {
    loading.value = false;
  }
}

function submitSearch() {
  pagination.current = 1;
  load();
}

function resetSearch() {
  keyword.value = '';
  source.value = undefined;
  pagination.current = 1;
  load();
}

function onTableChange(page: TablePaginationConfig) {
  pagination.current = page.current || 1;
  pagination.pageSize = page.pageSize || 20;
  load();
}

function openDescription(endpoint: ApiEndpoint) {
  editingEndpoint.value = endpoint;
  descriptionDraft.value = endpoint.description || '';
  descriptionOpen.value = true;
}

async function saveDescription() {
  if (!editingEndpoint.value) return;
  descriptionSaving.value = true;
  try {
    const updated = await updateApiEndpoint(editingEndpoint.value.id, {
      description: descriptionDraft.value.trim(),
    });
    Object.assign(editingEndpoint.value, {
      ...updated,
      updatedAt: formatDateTimeYmdHm(updated.updatedAt),
    });
    message.success('接口描述已更新');
    descriptionOpen.value = false;
  } catch (error) {
    message.error(errorMessage(error));
  } finally {
    descriptionSaving.value = false;
  }
}

function confirmLoggingChange(endpoint: ApiEndpoint, nextValue: boolean) {
  const previousValue = !nextValue;
  Modal.confirm({
    title: nextValue ? '确认记录接口日志？' : '确认停止记录接口日志？',
    content: nextValue
      ? `将记录 ${endpoint.method} ${endpoint.routePattern} 的普通访问日志。`
      : '停止后不再记录该接口的小程序普通访问日志；后台接口调用及 4xx/5xx 错误仍会强制记录。',
    okText: '确认',
    cancelText: '取消',
    onCancel: () => {
      endpoint.logEnabled = previousValue;
    },
    onOk: async () => {
      try {
        const updated = await updateApiEndpoint(endpoint.id, { logEnabled: nextValue });
        Object.assign(endpoint, {
          ...updated,
          updatedAt: formatDateTimeYmdHm(updated.updatedAt),
        });
        message.success(nextValue ? '已开始记录该接口日志' : '已停止记录该接口日志');
      } catch (error) {
        endpoint.logEnabled = previousValue;
        message.error(errorMessage(error));
        throw error;
      }
    },
  });
}

function handleLoggingChange(endpoint: ApiEndpoint, checked: boolean | string | number) {
  confirmLoggingChange(endpoint, Boolean(checked));
}

onMounted(load);
</script>
