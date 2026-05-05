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
      :scroll="{ x: 1196 }"
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
          <a-switch
            v-if="record.role !== 'SUPERADMIN'"
            :checked="record.enabled"
            checked-children="启用"
            un-checked-children="停用"
            @change="(checked: unknown) => toggleAdmin(record.id, Boolean(checked))"
          />
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
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { Modal, message } from 'ant-design-vue';
import type { TablePaginationConfig } from 'ant-design-vue';
import { createAdmin, errorMessage, listAdmins, updateAdmin } from '../api/admin';
import { formatDateTimeYmdHm } from '../utils/date';
import type { AdminType, AdminUser } from '../types/api';

const loading = ref(false);
const creating = ref(false);
const createOpen = ref(false);
const keyword = ref('');
const rows = ref<AdminUser[]>([]);
const pagination = reactive<TablePaginationConfig>({ current: 1, pageSize: 20, total: 0 });
const form = reactive<{ username: string; password: string; type: AdminType; orgName: string }>({
  username: '',
  password: '',
  type: 'OFFICIAL',
  orgName: '',
});

const columns = [
  { title: '账号', dataIndex: 'username', key: 'username', ellipsis: true, width: 140 },
  { title: '角色', key: 'role', width: 120, align: 'center' as const },
  { title: '类型', key: 'type', width: 120 },
  { title: '所属单位', key: 'orgName', ellipsis: true, width: 160 },
  { title: '状态', key: 'enabled', width: 88, align: 'center' as const },
  { title: '最近登录', dataIndex: 'lastLoginAt', key: 'lastLoginAt', width: 156 },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 156 },
  { title: '操作', key: 'action', width: 100, align: 'center' as const },
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
    await createAdmin(form);
    message.success('创建成功');
    createOpen.value = false;
    load();
  } catch (error) {
    message.error(errorMessage(error));
  } finally {
    creating.value = false;
  }
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
