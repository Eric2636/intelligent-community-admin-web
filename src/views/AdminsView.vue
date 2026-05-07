<template>
  <div class="table-card">
    <div class="toolbar">
      <a-input-search v-model:value="keyword" placeholder="搜索管理员账号" style="width: 280px" @search="load" />
      <a-button type="primary" @click="openCreate">新建管理员</a-button>
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
      :scroll="{ x: 1200 }"
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
          <a-tag :color="record.enabled ? 'green' : 'red'">{{ record.enabled ? '启用' : '停用' }}</a-tag>
        </template>
        <template v-if="column.key === 'lastLoginAt'">
          {{ formatDateTimeYmdHm(record.lastLoginAt) }}
        </template>
        <template v-if="column.key === 'createdAt'">
          {{ formatDateTimeYmdHm(record.createdAt) }}
        </template>
        <template v-if="column.key === 'action'">
          <a-space wrap>
            <a-button type="link" size="small" @click="handleBindClick(record)">{{ record.boundUserId ? '取消绑定' : '绑定用户' }}</a-button>
            <template v-if="record.role !== 'SUPERADMIN'">
              <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
              <a-button
                v-if="isSuperAdmin && record.id !== currentAdminId"
                type="link"
                size="small"
                @click="confirmSuperResetPassword(record)"
              >
                重置密码
              </a-button>
              <a-button type="link" size="small" danger @click="confirmDelete(record)">删除</a-button>
              <a-switch
                :checked="record.enabled"
                checked-children="启用"
                un-checked-children="停用"
                @change="(checked: unknown) => toggleAdmin(record.id, Boolean(checked))"
              />
            </template>
          </a-space>
        </template>
      </template>
    </a-table>

    <a-modal v-model:open="createOpen" title="新建普通管理员" @ok="submitCreate" :confirm-loading="creating">
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

    <a-modal v-model:open="editOpen" title="编辑管理员" @ok="submitEdit" :confirm-loading="editSaving" destroy-on-close>
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

    <a-modal v-model:open="bindOpen" title="绑定小程序用户" @ok="submitBind" :confirm-loading="bindSaving" destroy-on-close>
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
            @search="fetchBindUsers"
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
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { Modal, message } from 'ant-design-vue';
import type { TablePaginationConfig } from 'ant-design-vue';
import { createAdmin, deleteAdmin, errorMessage, listAdmins, listUsers, listUsersMiniByIds, superAdminResetAdminPasswordRandom, updateAdmin } from '../api/admin';
import { useAdminFromStorage } from '../composables/use-admin-from-storage';
import { formatDateTimeYmdHm } from '../utils/date';
import type { AdminType, AdminUser } from '../types/api';

const loading = ref(false);
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
  { title: '操作', key: 'action', width: 460, align: 'center' as const },
];

async function load() {
  loading.value = true;
  try {
    const data = await listAdmins({
      page: pagination.current,
      pageSize: pagination.pageSize,
      keyword: keyword.value || undefined,
    });
    rows.value = data.list;
    pagination.total = data.total;
    // 将 boundUserId 映射成用户名称
    const ids = [...new Set(data.list.map((x) => String(x.boundUserId || '').trim()).filter(Boolean))];
    if (ids.length) {
      const mini = await listUsersMiniByIds(ids);
      const m: Record<string, string> = {};
      for (const u of mini) m[u.id] = u.name || u.openid || u.id;
      boundUserNameMap.value = m;
    } else {
      boundUserNameMap.value = {};
    }
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
    okType: 'danger',
    async onOk() {
      await deleteAdmin(record.id);
      message.success('已删除');
      load();
    },
  });
}

function toggleAdmin(id: string, enabled: boolean) {
  Modal.confirm({
    title: enabled ? '确认启用管理员？' : '确认停用管理员？',
    async onOk() {
      await updateAdmin(id, { enabled });
      message.success('操作成功');
      load();
    },
  });
}

onMounted(load);
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
