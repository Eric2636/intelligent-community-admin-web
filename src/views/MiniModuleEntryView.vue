<template>
  <div class="admin-page">
    <PageHeader
      title="小程序入口管理"
      description="控制小程序底部 Tab 与各模块入口是否显示；用户下次打开或重新拉取配置后生效。"
      :breadcrumbs="['系统管理', '小程序入口管理']"
    />
    <div class="table-card">
    <TableToolbar :total="rows.length" :loading="loading" @refresh="load" />
    <a-table
      class="data-table"
      size="middle"
      row-key="key"
      :loading="loading"
      :columns="columns"
      :data-source="rows"
      :pagination="false"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'enabled'">
          <a-switch
            :checked="record.enabled"
            :disabled="record.always"
            checked-children="展示"
            un-checked-children="隐藏"
            @change="(checked: unknown) => onToggle(record.key, Boolean(checked))"
          />
          <span v-if="record.always" class="always-tag">固定展示</span>
        </template>
      </template>
    </a-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { message } from 'ant-design-vue';
import { errorMessage, listModuleEntryTabsAdmin, setModuleEntryTabEnabled } from '../api/admin';
import type { ModuleEntryTabConfig } from '../types/api';
import PageHeader from '../components/admin/PageHeader.vue';
import TableToolbar from '../components/admin/TableToolbar.vue';

const loading = ref(false);
const rows = ref<ModuleEntryTabConfig[]>([]);

const columns = [
  { title: '模块', dataIndex: 'label', key: 'label', width: 200 },
  { title: '标识', dataIndex: 'key', key: 'key', width: 120 },
  { title: '小程序展示', key: 'enabled', width: 220 },
];

async function load() {
  loading.value = true;
  try {
    const data = await listModuleEntryTabsAdmin();
    rows.value = data.tabs || [];
  } catch (e) {
    message.error(errorMessage(e));
  } finally {
    loading.value = false;
  }
}

async function onToggle(key: string, enabled: boolean) {
  const prev = rows.value.map((t) => ({ ...t }));
  rows.value = rows.value.map((t) => (t.key === key ? { ...t, enabled } : t));
  try {
    const data = await setModuleEntryTabEnabled(key, enabled);
    rows.value = data.tabs || [];
    const target = rows.value.find((item) => item.key === key);
    message.success(`小程序入口“${target?.label || key}”已${enabled ? '显示' : '隐藏'}`);
  } catch (e) {
    rows.value = prev;
    message.error(errorMessage(e));
  }
}

onMounted(() => load());
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.hint {
  color: rgba(0, 0, 0, 0.45);
  font-size: 13px;
}
.always-tag {
  margin-left: 12px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}
</style>
