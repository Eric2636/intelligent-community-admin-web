<template>
  <div class="admin-page">
    <PageHeader
      title="意见反馈"
      description="查看小程序用户提交的意见与建议，帮助持续改进社区服务。"
      :breadcrumbs="['用户服务', '意见反馈']"
    />

    <section class="feedback-panel">
      <FilterPanel>
        <div class="filter-field filter-field--wide">
          <label class="filter-field__label">关键词</label>
          <a-input
            v-model:value="filters.keyword"
            placeholder="搜索用户昵称或反馈内容"
            allow-clear
            @pressEnter="submitSearch"
          />
        </div>
        <div class="filter-field">
          <label class="filter-field__label">用户身份</label>
          <a-select v-model:value="filters.identity" placeholder="全部身份" allow-clear>
            <a-select-option value="OWNER">业主</a-select-option>
            <a-select-option value="OUTSIDER">小区外人员</a-select-option>
          </a-select>
        </div>
        <div class="filter-field">
          <label class="filter-field__label">提交时间</label>
          <a-range-picker
            v-model:value="filters.timeRange"
            format="YYYY-MM-DD"
            :placeholder="['开始日期', '结束日期']"
            allow-clear
          />
        </div>
        <template #actions>
          <a-button type="primary" @click="submitSearch">查询</a-button>
          <a-button @click="resetFilters">重置</a-button>
        </template>
      </FilterPanel>

      <a-alert v-if="loadError" class="load-alert" type="error" show-icon :message="loadError">
        <template #action><a-button size="small" @click="load()">重新加载</a-button></template>
      </a-alert>

      <TableToolbar :total="pagination.total" :loading="loading" @refresh="load()">
        <template #default>
          <span class="feedback-toolbar-hint">按提交时间由新到旧排列</span>
        </template>
      </TableToolbar>

      <a-list
        class="feedback-list"
        :loading="loading"
        :data-source="rows"
        :grid="{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 2, xxl: 3 }"
        :locale="{ emptyText: hasFilters ? '没有符合当前筛选条件的反馈' : '暂无意见反馈' }"
      >
        <template #renderItem="{ item: feedback }">
          <a-list-item>
            <a-card class="feedback-card" :bordered="true">
              <div class="feedback-card__header">
                <a-avatar :size="42" :src="feedback.avatar || undefined">
                  <template #icon><UserOutlined /></template>
                </a-avatar>
                <div class="feedback-card__user">
                  <div class="feedback-card__name">{{ feedback.nickname }}</div>
                  <a-tag :color="identityColor(feedback.identity)">
                    {{ feedback.identityLabel || '未设置身份' }}
                  </a-tag>
                </div>
                <time class="feedback-card__time">{{ formatDateTimeYmdHm(feedback.createdAt) }}</time>
              </div>
              <p class="feedback-card__content">{{ feedback.content }}</p>
            </a-card>
          </a-list-item>
        </template>
      </a-list>

      <div v-if="pagination.total > pagination.pageSize" class="feedback-pagination">
        <a-pagination
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :show-size-changer="true"
          :page-size-options="['12', '24', '48']"
          show-less-items
          @change="changePage"
          @showSizeChange="changePageSize"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';
import { UserOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import { errorMessage, listAdminFeedbacks } from '../api/admin';
import PageHeader from '../components/admin/PageHeader.vue';
import FilterPanel from '../components/admin/FilterPanel.vue';
import TableToolbar from '../components/admin/TableToolbar.vue';
import type { AdminFeedback } from '../types/api';
import { formatDateTimeYmdHm } from '../utils/date';
import { createLatestRequestRunner } from '../utils/latest-request';

type DateRangeValue = Array<{ startOf: (unit: string) => { toISOString: () => string }; endOf: (unit: string) => { toISOString: () => string } }>;

const loading = ref(false);
const loadError = ref('');
const rows = ref<AdminFeedback[]>([]);
const filters = reactive<{
  keyword: string;
  identity?: 'OWNER' | 'OUTSIDER';
  timeRange: DateRangeValue;
}>({
  keyword: '',
  identity: undefined,
  timeRange: [],
});
const pagination = reactive({ current: 1, pageSize: 12, total: 0 });
const listRequest = createLatestRequestRunner();
const hasFilters = computed(
  () => Boolean(filters.keyword.trim() || filters.identity || filters.timeRange.length),
);

function requestParams() {
  const start = filters.timeRange[0];
  const end = filters.timeRange[1];
  return {
    page: pagination.current,
    pageSize: pagination.pageSize,
    keyword: filters.keyword.trim() || undefined,
    identity: filters.identity,
    startAt: start?.startOf('day').toISOString(),
    endAt: end?.endOf('day').toISOString(),
  };
}

async function load(deduplicate = false) {
  const params = requestParams();
  await listRequest.run({
    key: JSON.stringify(params),
    deduplicate,
    request: () => listAdminFeedbacks(params),
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

function resetFilters() {
  filters.keyword = '';
  filters.identity = undefined;
  filters.timeRange = [];
  pagination.current = 1;
  load();
}

function changePage(page: number) {
  pagination.current = page;
  load();
}

function changePageSize(_page: number, pageSize: number) {
  pagination.current = 1;
  pagination.pageSize = pageSize;
  load();
}

function identityColor(identity: string) {
  if (identity === 'OWNER') return 'green';
  return 'default';
}

onMounted(load);
onUnmounted(listRequest.dispose);
</script>

<style scoped>
.feedback-panel {
  padding: 20px 24px 24px;
  border: 1px solid #e6e8eb;
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 2px 6px rgba(0, 21, 41, 0.06);
}

.feedback-toolbar-hint {
  color: #86909c;
  font-size: 12px;
}

.feedback-list {
  min-height: 180px;
}

.feedback-list :deep(.ant-list-item) {
  height: 100%;
  margin-bottom: 16px;
  padding: 0;
}

.feedback-card {
  height: 100%;
  border-color: #e5e6eb;
  box-shadow: 0 1px 2px rgba(0, 21, 41, 0.04);
}

.feedback-card:hover {
  border-color: #b8c5d6;
  box-shadow: 0 4px 12px rgba(0, 21, 41, 0.08);
}

.feedback-card__header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.feedback-card__user {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.feedback-card__name {
  max-width: 150px;
  overflow: hidden;
  color: #1d2129;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.feedback-card__time {
  flex-shrink: 0;
  margin-left: auto;
  color: #86909c;
  font-size: 12px;
}

.feedback-card__content {
  min-height: 66px;
  margin: 16px 0 0;
  overflow-wrap: anywhere;
  color: #4e5969;
  font-size: 14px;
  line-height: 22px;
  white-space: pre-wrap;
}

.feedback-pagination {
  display: flex;
  justify-content: flex-end;
  padding-top: 8px;
}

@media (max-width: 768px) {
  .feedback-card__header {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .feedback-card__time {
    width: 100%;
    margin-left: 54px;
  }
}
</style>
