<template>
  <div class="admin-page">
    <PageHeader
      title="市场分类"
      description="维护小区市场的商品分类、展示顺序和可用状态。"
      :breadcrumbs="['运营管理', '市场分类']"
    >
      <template #actions><a-button type="primary" @click="openCreate">新增分类</a-button></template>
    </PageHeader>
    <div class="table-card">
    <TableToolbar :total="rows.length" :loading="loading" @refresh="load" />
    <a-table class="data-table" row-key="id" :loading="loading" :columns="columns" :data-source="rows" :pagination="false">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'enabled'">
          <a-switch :checked="record.enabled" @change="(checked: unknown) => toggleEnabled(record, Boolean(checked))" />
        </template>
        <template v-if="column.key === 'createdAt'">
          {{ formatDateTimeYmdHm(record.createdAt) }}
        </template>
        <template v-if="column.key === 'actions'">
          <a-space>
            <a-button size="small" @click="openEdit(record)">编辑</a-button>
            <a-button size="small" danger @click="confirmDelete(record)">删除</a-button>
          </a-space>
        </template>
      </template>
    </a-table>

    <a-modal
      v-model:open="modalOpen"
      :title="form.id ? '编辑分类' : '新增分类'"
      :confirm-loading="saving"
      @ok="submit"
      destroy-on-close
    >
      <a-form layout="vertical">
        <a-form-item label="分类名称" required>
          <a-input v-model:value="form.name" placeholder="例如：跳蚤市场" />
        </a-form-item>
        <a-form-item label="排序">
          <a-input-number v-model:value="form.sortOrder" :min="0" style="width: 100%" />
        </a-form-item>
        <a-form-item label="启用">
          <a-switch v-model:checked="form.enabled" />
        </a-form-item>
      </a-form>
    </a-modal>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { Modal, message } from 'ant-design-vue';
import {
  createMallCategory,
  deleteMallCategory,
  errorMessage,
  listMallCategories,
  updateMallCategory,
} from '../api/admin';
import type { MallCategory } from '../types/api';
import { formatDateTimeYmdHm } from '../utils/date';
import PageHeader from '../components/admin/PageHeader.vue';
import TableToolbar from '../components/admin/TableToolbar.vue';

const loading = ref(false);
const saving = ref(false);
const modalOpen = ref(false);
const rows = ref<MallCategory[]>([]);
const form = reactive({
  id: '',
  name: '',
  sortOrder: 0,
  enabled: true,
});

const columns = [
  { title: '分类名称', dataIndex: 'name', key: 'name' },
  { title: '排序', dataIndex: 'sortOrder', key: 'sortOrder', width: 120 },
  { title: '启用', dataIndex: 'enabled', key: 'enabled', width: 120 },
  { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
  { title: '操作', key: 'actions', width: 160 },
];

async function load() {
  loading.value = true;
  try {
    rows.value = await listMallCategories();
  } catch (error) {
    message.error(errorMessage(error));
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  form.id = '';
  form.name = '';
  form.sortOrder = rows.value.length ? Math.max(...rows.value.map((x) => x.sortOrder || 0)) + 10 : 10;
  form.enabled = true;
}

function openCreate() {
  resetForm();
  modalOpen.value = true;
}

function openEdit(record: MallCategory) {
  form.id = record.id;
  form.name = record.name;
  form.sortOrder = record.sortOrder;
  form.enabled = record.enabled;
  modalOpen.value = true;
}

async function submit() {
  const name = form.name.trim();
  if (!name) {
    message.warning('请输入分类名称');
    return Promise.reject();
  }
  saving.value = true;
  try {
    if (form.id) {
      await updateMallCategory(form.id, { name, sortOrder: form.sortOrder, enabled: form.enabled });
      message.success('已保存');
    } else {
      await createMallCategory({ name, sortOrder: form.sortOrder, enabled: form.enabled });
      message.success('已新增');
    }
    modalOpen.value = false;
    await load();
  } catch (error) {
    message.error(errorMessage(error));
    return Promise.reject(error);
  } finally {
    saving.value = false;
  }
}

async function toggleEnabled(record: MallCategory, enabled: boolean) {
  try {
    await updateMallCategory(record.id, { enabled });
    message.success(`分类“${record.name}”已${enabled ? '启用' : '停用'}`);
    await load();
  } catch (error) {
    message.error(errorMessage(error));
  }
}

function confirmDelete(record: MallCategory) {
  Modal.confirm({
    title: '确认删除该分类？',
    content: '已被商品使用的分类不能删除，请改为停用。',
    okText: '删除',
    okType: 'danger',
    async onOk() {
      await deleteMallCategory(record.id);
      message.success('已删除');
      await load();
    },
  });
}

onMounted(load);
</script>
