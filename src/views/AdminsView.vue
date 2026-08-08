<template>
  <div class="admin-page">
    <PageHeader
      title="管理员管理"
      description="管理后台账号、角色、所属单位及其绑定的小程序用户。"
      :breadcrumbs="['用户与权限', '管理员管理']"
    >
      <template #actions>
        <a-button type="primary" @click="openCreate">新建管理员</a-button>
      </template>
    </PageHeader>
    <div class="table-card">
    <CompactSearchBar
      v-model="keyword"
      placeholder="搜索管理员账号"
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
      :scroll="{ x: 1200 }"
      :sticky="{ offsetHeader: 56 }"
      :locale="{ emptyText: keyword ? '没有符合当前搜索条件的管理员' : '暂无管理员数据' }"
      @change="onTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'role'">
          <a-tag :color="record.role === 'SUPERADMIN' ? 'gold' : 'default'">
            {{ record.role === 'SUPERADMIN' ? '超级管理员' : '普通管理员' }}
          </a-tag>
        </template>
        <template v-if="column.key === 'type'">
          {{ record.type === 'THIRD_PARTY' ? '第三方管理员' : '官方管理员' }}
        </template>
        <template v-if="column.key === 'orgName'">
          {{ record.orgName || '-' }}
        </template>
        <template v-if="column.key === 'boundUserId'">
          <span class="mono">{{ record.boundUserId ? (boundUserNameMap[String(record.boundUserId)] || record.boundUserId) : '-' }}</span>
        </template>
        <template v-if="column.key === 'enabled'">
          <a-tag :color="record.enabled ? 'green' : 'red'">{{ record.enabled ? '正常' : '已停用' }}</a-tag>
        </template>
        <template v-if="column.key === 'lastLoginAt'">
          {{ formatDateTimeYmdHm(record.lastLoginAt) }}
        </template>
        <template v-if="column.key === 'createdAt'">
          {{ formatDateTimeYmdHm(record.createdAt) }}
        </template>
        <template v-if="column.key === 'action'">
          <a-space :size="4">
            <a-tooltip :title="record.boundUserId ? '取消绑定用户' : '绑定小程序用户'">
              <a-button
                type="text"
                shape="circle"
                :aria-label="record.boundUserId ? '取消绑定用户' : '绑定小程序用户'"
                @click="handleBindClick(record)"
              >
                <template #icon><DisconnectOutlined v-if="record.boundUserId" /><LinkOutlined v-else /></template>
              </a-button>
            </a-tooltip>
            <template v-if="record.role !== 'SUPERADMIN'">
              <a-tooltip title="编辑管理员">
                <a-button type="text" shape="circle" aria-label="编辑管理员" @click="openEdit(record)">
                  <template #icon><EditOutlined /></template>
                </a-button>
              </a-tooltip>
              <a-tooltip v-if="isSuperAdmin && record.id !== currentAdminId" title="重置密码">
                <a-button type="text" shape="circle" aria-label="重置密码" @click="confirmSuperResetPassword(record)">
                  <template #icon><KeyOutlined /></template>
                </a-button>
              </a-tooltip>
              <a-tooltip title="删除管理员">
                <a-button type="text" shape="circle" danger aria-label="删除管理员" @click="confirmDelete(record)">
                  <template #icon><DeleteOutlined /></template>
                </a-button>
              </a-tooltip>
              <a-tooltip :title="record.enabled ? '停用管理员' : '启用管理员'">
                  <a-button
                    type="text"
                    shape="circle"
                    :danger="record.enabled"
                    :aria-label="record.enabled ? '停用管理员' : '启用管理员'"
                    @click="toggleAdmin(record)"
                  >
                    <template #icon><StopOutlined v-if="record.enabled" /><CheckCircleOutlined v-else /></template>
                  </a-button>
              </a-tooltip>
            </template>
          </a-space>
        </template>
      </template>
    </a-table>

    <a-modal v-model:open="createOpen" title="新建普通管理员" ok-text="确认" cancel-text="取消" @ok="submitCreate" :confirm-loading="creating">
      <a-form layout="vertical" :model="form">
        <a-form-item label="账号" required>
          <a-input v-model:value="form.username" />
        </a-form-item>
        <a-form-item label="密码" required>
          <a-input-password v-model:value="form.password" />
        </a-form-item>
        <a-form-item label="管理员类型">
          <a-select v-model:value="form.type" @change="handleTypeChange">
            <a-select-option value="OFFICIAL">官方管理员</a-select-option>
            <a-select-option value="THIRD_PARTY">第三方管理员</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item v-if="form.type === 'THIRD_PARTY'" label="所属单位" required>
          <a-input v-model:value="form.orgName" placeholder="例如：居委会 / 供电局" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:open="editOpen" title="编辑管理员" ok-text="确认" cancel-text="取消" @ok="submitEdit" :confirm-loading="editSaving" destroy-on-close>
      <a-form layout="vertical" :model="editForm">
        <a-form-item label="账号">
          <a-input :value="editUsername" disabled />
        </a-form-item>
        <a-form-item label="管理员类型">
          <a-select v-model:value="editForm.type" @change="handleEditTypeChange">
            <a-select-option value="OFFICIAL">官方管理员</a-select-option>
            <a-select-option value="THIRD_PARTY">第三方管理员</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item v-if="editForm.type === 'THIRD_PARTY'" label="所属单位" required>
          <a-input v-model:value="editForm.orgName" placeholder="例如：居委会 / 供电局" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:open="bindOpen" title="绑定小程序用户" ok-text="确认" cancel-text="取消" @ok="submitBind" :confirm-loading="bindSaving" destroy-on-close>
      <a-form layout="vertical">
        <a-form-item label="选择小程序用户">
          <a-select
            v-model:value="bindForm.boundUserId"
            allow-clear
            show-search
            :filter-option="false"
            :not-found-content="bindUserLoading ? '加载中…' : '无匹配用户'"
            :loading="bindUserLoading"
            placeholder="输入昵称或 OpenID 搜索"
            @search="captureBindUserKeyword"
            @inputKeyDown="submitBindUserSearch"
          >
            <a-select-option v-for="u in bindUserOptions" :key="u.id" :value="u.id" :disabled="takenBoundUserIds.has(u.id)">
              {{ (u.name || '未命名') + '（' + u.id + '）' }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <div style="color: rgba(0, 0, 0, 0.45); font-size: 12px">留空并保存可解除绑定</div>
      </a-form>
    </a-modal>

    <a-modal v-model:open="resetResultOpen" title="密码已重置" :footer="null" destroy-on-close>
      <p class="pwd-hint">账号 <span class="mono">{{ resetResultUsername }}</span> 的新密码（仅显示这一次，请通知对方并妥善保存）：</p>
      <a-input-group compact>
        <a-input class="mono" style="width: calc(100% - 88px)" readonly :value="resetResultPassword" />
        <a-button type="primary" style="width: 88px" @click="copyResetResultPassword">复制</a-button>
      </a-input-group>
    </a-modal>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { Modal, message } from 'ant-design-vue';
import {
  CheckCircleOutlined,
  DeleteOutlined,
  DisconnectOutlined,
  EditOutlined,
  KeyOutlined,
  LinkOutlined,
  StopOutlined,
} from '@ant-design/icons-vue';
import type { TablePaginationConfig } from 'ant-design-vue';
import { createAdmin, deleteAdmin, errorMessage, listAdmins, listUsers, listUsersMiniByIds, superAdminResetAdminPasswordRandom, updateAdmin } from '../api/admin';
import { useAdminFromStorage } from '../composables/use-admin-from-storage';
import { formatDateTimeYmdHm } from '../utils/date';
import { submitOnPlainEnter } from '../utils/keyboard';
import { createLatestRequestRunner } from '../utils/latest-request';
import type { AdminType, AdminUser } from '../types/api';
import PageHeader from '../components/admin/PageHeader.vue';
import TableToolbar from '../components/admin/TableToolbar.vue';
import CompactSearchBar from '../components/admin/CompactSearchBar.vue';

const loading = ref(false);
const loadError = ref('');
const creating = ref(false);
const createOpen = ref(false);
const editOpen = ref(false);
const editSaving = ref(false);
const editTargetId = ref<string | null>(null);
const editUsername = ref('');
const bindOpen = ref(false);
const bindSaving = ref(false);
const bindTargetId = ref<string | null>(null);
const keyword = ref('');
const rows = ref<AdminUser[]>([]);
const pagination = reactive<TablePaginationConfig>({ current: 1, pageSize: 20, total: 0 });
const listRequest = createLatestRequestRunner();
const form = reactive<{
  username: string;
  password: string;
  type: AdminType;
  orgName: string;
}>({
  username: '',
  password: '',
  type: 'OFFICIAL',
  orgName: '',
});
const editForm = reactive<{ type: AdminType; orgName: string }>({
  type: 'OFFICIAL',
  orgName: '',
});

const bindForm = reactive<{ boundUserId: string }>({ boundUserId: '' });
const bindUserOptions = ref<Array<{ id: string; name: string; openid: string }>>([]);
const bindUserLoading = ref(false);
const bindUserKeyword = ref('');
const boundUserNameMap = ref<Record<string, string>>({});
const takenBoundUserIds = ref<Set<string>>(new Set());

const resetResultOpen = ref(false);
const resetResultPassword = ref('');
const resetResultUsername = ref('');

const sessionAdmin = useAdminFromStorage();
const currentAdminId = computed(() => sessionAdmin.value?.id || '');
const isSuperAdmin = computed(() => sessionAdmin.value?.role === 'SUPERADMIN');

const columns = [
  { title: '账号', dataIndex: 'username', key: 'username', ellipsis: true, width: 140 },
  { title: '角色', key: 'role', width: 120, align: 'center' as const },
  { title: '类型', key: 'type', width: 120 },
  { title: '所属单位', key: 'orgName', ellipsis: true, width: 160 },
  { title: '绑定用户', key: 'boundUserId', ellipsis: true, width: 200 },
  { title: '状态', key: 'enabled', width: 88, align: 'center' as const },
  { title: '最近登录', dataIndex: 'lastLoginAt', key: 'lastLoginAt', width: 156 },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 156 },
  { title: '操作', key: 'action', width: 220, fixed: 'right' as const, align: 'center' as const },
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
    request: async () => {
      const data = await listAdmins(params);
      const ids = [...new Set(data.list.map((x) => String(x.boundUserId || '').trim()).filter(Boolean))];
      const names: Record<string, string> = {};
      if (ids.length) {
        const mini = await listUsersMiniByIds(ids);
        for (const user of mini) names[user.id] = user.name || user.openid || user.id;
      }
      return { data, names };
    },
    onSuccess: ({ data, names }) => {
      loadError.value = '';
      rows.value = data.list;
      pagination.total = data.total;
      boundUserNameMap.value = names;
    },
    onError: (error) => {
      rows.value = [];
      pagination.total = 0;
      boundUserNameMap.value = {};
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

function openCreate() {
  form.username = '';
  form.password = '';
  form.type = 'OFFICIAL';
  form.orgName = '';
  createOpen.value = true;
}

function openEdit(record: AdminUser) {
  editTargetId.value = record.id;
  editUsername.value = record.username;
  editForm.type = record.type;
  editForm.orgName = record.orgName || '';
  editOpen.value = true;
}

function handleBindClick(record: AdminUser) {
  if (record.boundUserId) {
    Modal.confirm({
      title: '确认取消绑定？',
      content: `将解除管理员「${record.username}」与小程序用户的绑定关系。`,
      okText: '确认',
      cancelText: '取消',
      async onOk() {
        await updateAdmin(record.id, { boundUserId: '' });
        message.success('已解除绑定');
        load();
      },
    });
    return;
  }
  openBind(record);
}

function openBind(record: AdminUser) {
  bindTargetId.value = record.id;
  bindForm.boundUserId = record.boundUserId || '';
  bindUserOptions.value = [];
  bindUserKeyword.value = '';
  const targetId = record.id;
  takenBoundUserIds.value = new Set(
    rows.value
      .filter((a) => a.id !== targetId)
      .map((a) => String(a.boundUserId || '').trim())
      .filter(Boolean),
  );
  bindOpen.value = true;
  // 打开时先用关键词查询一下（空关键词会返回最新用户）
  fetchBindUsers('');
}

let bindUserReqSeq = 0;

function captureBindUserKeyword(value: string) {
  bindUserKeyword.value = value;
}

function submitBindUserSearch(event: KeyboardEvent) {
  submitOnPlainEnter(event, () => fetchBindUsers(bindUserKeyword.value), { stopPropagation: true });
}

async function fetchBindUsers(keyword: string) {
  bindUserLoading.value = true;
  const seq = ++bindUserReqSeq;
  try {
    const res = await listUsers({ page: 1, pageSize: 20, keyword: keyword?.trim() || undefined });
    if (seq !== bindUserReqSeq) return;
    bindUserOptions.value = res.list.map((u) => ({
      id: u.id,
      name: u.name || '',
      openid: u.openid,
    }));
  } finally {
    if (seq === bindUserReqSeq) bindUserLoading.value = false;
  }
}

function handleEditTypeChange(value: AdminType) {
  if (value === 'OFFICIAL') {
    editForm.orgName = '';
  }
}

function handleTypeChange(value: AdminType) {
  if (value === 'OFFICIAL') {
    form.orgName = '';
  }
}

async function submitCreate() {
  if (!form.username || !form.password) {
    message.warning('请填写账号和密码');
    return;
  }
  if (form.type === 'THIRD_PARTY' && !form.orgName) {
    message.warning('第三方管理员请填写所属单位');
    return;
  }
  creating.value = true;
  try {
    await createAdmin({
      username: form.username,
      password: form.password,
      type: form.type,
      orgName: form.orgName,
    });
    message.success('创建成功');
    createOpen.value = false;
    load();
  } catch (error) {
    message.error(errorMessage(error));
  } finally {
    creating.value = false;
  }
}

async function submitEdit() {
  if (!editTargetId.value) return;
  if (editForm.type === 'THIRD_PARTY' && !editForm.orgName.trim()) {
    message.warning('第三方管理员请填写所属单位');
    return;
  }
  editSaving.value = true;
  try {
    await updateAdmin(editTargetId.value, {
      type: editForm.type,
      orgName: editForm.orgName,
    });
    message.success('已保存');
    editOpen.value = false;
    load();
  } catch (error) {
    message.error(errorMessage(error));
    return Promise.reject(error);
  } finally {
    editSaving.value = false;
  }
}

async function submitBind() {
  if (!bindTargetId.value) return;
  bindSaving.value = true;
  try {
    await updateAdmin(bindTargetId.value, { boundUserId: bindForm.boundUserId.trim() });
    message.success(bindForm.boundUserId.trim() ? '已绑定' : '已解绑');
    bindOpen.value = false;
    load();
  } catch (error) {
    message.error(errorMessage(error));
    return Promise.reject(error);
  } finally {
    bindSaving.value = false;
  }
}

function confirmSuperResetPassword(record: AdminUser) {
  Modal.confirm({
    title: '确认重置该管理员的密码？',
    content: '将生成随机密码，成功后在弹窗中仅展示一次，请复制并告知对方。',
    okText: '重置',
    cancelText: '取消',
    async onOk() {
      try {
        const data = await superAdminResetAdminPasswordRandom(record.id);
        resetResultUsername.value = data.username;
        resetResultPassword.value = data.password;
        resetResultOpen.value = true;
      } catch (error) {
        message.error(errorMessage(error));
        return Promise.reject(error);
      }
    },
  });
}

async function copyResetResultPassword() {
  const t = resetResultPassword.value;
  if (!t) return;
  try {
    await navigator.clipboard.writeText(t);
    message.success('已复制');
  } catch {
    message.warning('复制失败，请手动选择复制');
  }
}

function confirmDelete(record: AdminUser) {
  if (record.id === currentAdminId.value) {
    message.warning('不能删除当前登录账号');
    return;
  }
  Modal.confirm({
    title: '确认删除该管理员？',
    content: `将永久删除账号「${record.username}」，不可恢复。`,
    okText: '删除',
    cancelText: '取消',
    okType: 'danger',
    async onOk() {
      await deleteAdmin(record.id);
      message.success('已删除');
      load();
    },
  });
}

function toggleAdmin(record: AdminUser) {
  const enabled = !record.enabled;
  Modal.confirm({
    title: enabled ? '确认启用管理员？' : '确认停用管理员？',
    content: enabled
      ? `启用后，管理员“${record.username}”可以恢复登录和后台操作。`
      : `停用后，管理员“${record.username}”将无法继续登录后台。`,
    okText: enabled ? '启用' : '停用',
    cancelText: '取消',
    okType: enabled ? 'primary' : 'danger',
    async onOk() {
      await updateAdmin(record.id, { enabled });
      message.success(`管理员“${record.username}”已${enabled ? '启用' : '停用'}`);
      load();
    },
  });
}

onMounted(load);
onUnmounted(listRequest.dispose);
</script>

<style scoped>
.mono {
  font-family: ui-monospace, monospace;
  font-size: 12px;
}
.pwd-hint {
  margin: 0 0 12px;
  color: rgba(0, 0, 0, 0.65);
  font-size: 13px;
}
</style>
