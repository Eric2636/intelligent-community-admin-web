<template>
  <div class="admin-page">
    <PageHeader
      title="用户管理"
      description="查看小程序用户状态与身份标签，并处理违规账号。"
      :breadcrumbs="['用户与权限', '用户管理']"
    />
    <div class="table-card">
    <CompactSearchBar
      v-model="keyword"
      class="users-filter-bar"
      placeholder="搜索昵称或 OpenID"
      @search="submitSearch"
    />
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
      :scroll="{ x: 940 }"
      :sticky="{ offsetHeader: 56 }"
      :locale="{ emptyText: keyword ? '没有符合当前搜索条件的用户' : '暂无用户数据' }"
      @change="onTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'enabled'">
          <a-tag :color="record.enabled ? 'green' : 'red'">{{ record.enabled ? '正常' : '已冻结' }}</a-tag>
        </template>
        <template v-if="column.key === 'userTagLabel'">
          <a-tag v-if="record.userTagLabel" :color="tagColor(record.userTagType)">
            {{ record.userTagLabel }}
          </a-tag>
          <span v-else style="color: rgba(0, 0, 0, 0.25)">-</span>
        </template>
        <template v-if="column.key === 'createdAt'">
          {{ formatDateTimeYmdHm(record.createdAt) }}
        </template>
        <template v-if="column.key === 'disabledReason'">
          <a-tooltip v-if="record.disabledReason" :title="record.disabledReason">
            <span class="table-cell-ellipsis">{{ record.disabledReason }}</span>
          </a-tooltip>
          <span v-else class="table-empty-value">—</span>
        </template>
        <template v-if="column.key === 'action'">
          <a-button
            v-if="canManageUsers"
            type="link"
            size="small"
            :danger="record.enabled"
            @click="toggleUser(record.id, !record.enabled)"
          >
            {{ record.enabled ? '冻结' : '解冻' }}
          </a-button>
        </template>
      </template>
    </a-table>

    <a-modal
      v-model:open="reasonOpen"
      title="冻结用户"
      ok-text="确认"
      cancel-text="取消"
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { Modal, message } from 'ant-design-vue';
import type { TablePaginationConfig } from 'ant-design-vue';
import { errorMessage, listUsers, updateUserEnabled } from '../api/admin';
import { useAdminFromStorage } from '../composables/use-admin-from-storage';
import { formatDateTimeYmdHm } from '../utils/date';
import { createLatestRequestRunner } from '../utils/latest-request';
import type { MiniUser } from '../types/api';
import PageHeader from '../components/admin/PageHeader.vue';
import TableToolbar from '../components/admin/TableToolbar.vue';
import CompactSearchBar from '../components/admin/CompactSearchBar.vue';

const loading = ref(false);
const loadError = ref('');
const keyword = ref('');
const rows = ref<MiniUser[]>([]);
const pagination = reactive<TablePaginationConfig>({ current: 1, pageSize: 20, total: 0 });
const listRequest = createLatestRequestRunner();
const currentAdmin = useAdminFromStorage();
const canManageUsers = computed(() => currentAdmin.value?.role === 'SUPERADMIN');

const reasonOpen = ref(false);
const reasonSaving = ref(false);
const reasonTarget = ref<{ userId: string; enabled: boolean; name?: string; openid?: string } | null>(null);
const reasonForm = reactive<{ reason: string }>({ reason: '' });

const columns = [
  { title: '昵称', dataIndex: 'name', key: 'name', ellipsis: true, width: 210 },
  { title: '用户标签', dataIndex: 'userTagLabel', key: 'userTagLabel', width: 120 },
  { title: '状态', key: 'enabled', width: 100 },
  { title: '冻结原因', dataIndex: 'disabledReason', key: 'disabledReason', width: 230 },
  { title: '注册时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
  { title: '操作', key: 'action', width: 100, align: 'center' as const, fixed: 'right' as const },
];

async function load(deduplicate = false) {
  const params = {
    page: pagination.current,
    pageSize: pagination.pageSize,
    keyword: keyword.value || undefined,
  };
  await listRequest.run({
    key: JSON.stringify(params),
    deduplicate,
    request: () => listUsers(params),
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

function submitSearch() {
  pagination.current = 1;
  load(true);
}

function onTableChange(page: TablePaginationConfig) {
  pagination.current = page.current || 1;
  pagination.pageSize = page.pageSize || 20;
  load();
}

function tagColor(type?: MiniUser['userTagType']) {
  if (type === 'admin') return 'blue';
  if (type === 'owner') return 'green';
  if (type === 'outsider') return 'default';
  return 'default';
}

function toggleUser(id: string, enabled: boolean) {
  if (enabled) {
    Modal.confirm({
      title: '确认启用用户？',
      content: '启用后用户可以恢复写操作。',
      okText: '确认',
      cancelText: '取消',
      async onOk() {
        await updateUserEnabled(id, { enabled: true });
        message.success(`用户“${rows.value.find((item) => item.id === id)?.name || id}”已恢复正常`);
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
onUnmounted(listRequest.dispose);
</script>
