<template>
  <div class="table-card">
    <div class="toolbar">
      <a-input-search v-model:value="keyword" placeholder="搜索昵称或 OpenID" style="width: 280px" @search="load" />
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
      :scroll="{ x: 1060 }"
      @change="onTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'enabled'">
          <a-tag :color="record.enabled ? 'green' : 'red'">{{ record.enabled ? '正常' : '冻结' }}</a-tag>
        </template>
        <template v-if="column.key === 'createdAt'">
          {{ formatDateTimeYmdHm(record.createdAt) }}
        </template>
        <template v-if="column.key === 'action'">
          <a-switch
            v-if="canManageUsers"
            :checked="record.enabled"
            checked-children="启用"
            un-checked-children="冻结"
            @change="(checked: unknown) => toggleUser(record.id, Boolean(checked))"
          />
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { Modal, message } from 'ant-design-vue';
import type { TablePaginationConfig } from 'ant-design-vue';
import { errorMessage, listUsers, updateUserEnabled } from '../api/admin';
import { formatDateTimeYmdHm } from '../utils/date';
import type { MiniUser } from '../types/api';

const loading = ref(false);
const keyword = ref('');
const rows = ref<MiniUser[]>([]);
const pagination = reactive<TablePaginationConfig>({ current: 1, pageSize: 20, total: 0 });
const currentAdmin = computed(() => JSON.parse(localStorage.getItem('admin_user') || '{}'));
const canManageUsers = computed(() => currentAdmin.value.role === 'SUPERADMIN');

const columns = [
  { title: '昵称', dataIndex: 'name', key: 'name', ellipsis: true, width: 120 },
  { title: 'OpenID', dataIndex: 'openid', key: 'openid', ellipsis: true, width: 240 },
  { title: '状态', key: 'enabled', width: 88, align: 'center' as const },
  { title: '冻结原因', dataIndex: 'disabledReason', key: 'disabledReason', ellipsis: true, width: 200 },
  { title: '注册时间', dataIndex: 'createdAt', key: 'createdAt', width: 156 },
  { title: '操作', key: 'action', width: 100, align: 'center' as const },
];

async function load() {
  loading.value = true;
  try {
    const data = await listUsers({
      page: pagination.current,
      pageSize: pagination.pageSize,
      keyword: keyword.value || undefined,
    });
    rows.value = data.list;
    pagination.total = data.total;
  } catch (error) {
    message.error(errorMessage(error));
  } finally {
    loading.value = false;
  }
}

function onTableChange(page: TablePaginationConfig) {
  pagination.current = page.current || 1;
  pagination.pageSize = page.pageSize || 20;
  load();
}

function toggleUser(id: string, enabled: boolean) {
  Modal.confirm({
    title: enabled ? '确认启用用户？' : '确认冻结用户？',
    content: enabled ? '启用后用户可以恢复写操作。' : '冻结后用户不能发布、评论、点赞、收藏等写操作。',
    async onOk() {
      await updateUserEnabled(id, { enabled, reason: enabled ? undefined : '后台冻结' });
      message.success('操作成功');
      load();
    },
  });
}

onMounted(load);
</script>
