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
      :scroll="{ x: 820 }"
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

    <a-modal
      v-model:open="reasonOpen"
      title="冻结用户"
      :confirm-loading="reasonSaving"
      @ok="submitFreeze"
      destroy-on-close
    >
      <div style="margin-bottom: 8px; color: rgba(0, 0, 0, 0.65); font-size: 13px">
        <span>将冻结该用户的写操作（发布/评论/点赞/收藏等）。</span>
      </div>
      <a-form layout="vertical">
        <a-form-item label="冻结原因" required>
          <a-textarea
            v-model:value="reasonForm.reason"
            placeholder="例如：恶意刷屏 / 违规内容 / 投诉核实中"
            :auto-size="{ minRows: 3, maxRows: 6 }"
            show-count
            :maxlength="200"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { Modal, message } from 'ant-design-vue';
import type { TablePaginationConfig } from 'ant-design-vue';
import { errorMessage, listUsers, updateUserEnabled } from '../api/admin';
import { useAdminFromStorage } from '../composables/use-admin-from-storage';
import { formatDateTimeYmdHm } from '../utils/date';
import type { MiniUser } from '../types/api';

const loading = ref(false);
const keyword = ref('');
const rows = ref<MiniUser[]>([]);
const pagination = reactive<TablePaginationConfig>({ current: 1, pageSize: 20, total: 0 });
const currentAdmin = useAdminFromStorage();
const canManageUsers = computed(() => currentAdmin.value?.role === 'SUPERADMIN');

const reasonOpen = ref(false);
const reasonSaving = ref(false);
const reasonTarget = ref<{ userId: string; enabled: boolean; name?: string; openid?: string } | null>(null);
const reasonForm = reactive<{ reason: string }>({ reason: '' });

const columns = [
  { title: '昵称', dataIndex: 'name', key: 'name', ellipsis: true, width: 120 },
  { title: '状态', key: 'enabled', width: 88, align: 'center' as const },
  { title: '冻结原因', dataIndex: 'disabledReason', key: 'disabledReason', ellipsis: true, width: 260 },
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
  if (enabled) {
    Modal.confirm({
      title: '确认启用用户？',
      content: '启用后用户可以恢复写操作。',
      async onOk() {
        await updateUserEnabled(id, { enabled: true });
        message.success('操作成功');
        load();
      },
    });
    return;
  }

  const row = rows.value.find((x) => x.id === id);
  reasonTarget.value = { userId: id, enabled: false, name: row?.name, openid: row?.openid };
  reasonForm.reason = (row?.disabledReason || '').trim();
  reasonOpen.value = true;
}

async function submitFreeze() {
  if (!reasonTarget.value) return;
  const id = reasonTarget.value.userId;
  const reason = reasonForm.reason.trim();
  if (!reason) {
    message.warning('请填写冻结原因');
    return Promise.reject();
  }
  reasonSaving.value = true;
  try {
    await updateUserEnabled(id, { enabled: false, reason });
    message.success('已冻结');
    reasonOpen.value = false;
    await load();
  } catch (e) {
    message.error(errorMessage(e));
    return Promise.reject(e);
  } finally {
    reasonSaving.value = false;
  }
}

onMounted(load);
</script>
