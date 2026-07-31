<template>
  <div class="table-toolbar">
    <div class="table-toolbar__summary">
      <span>共 <strong>{{ total }}</strong> 条</span>
      <span v-if="updatedAt" class="table-toolbar__updated">最近更新：{{ updatedAt }}</span>
    </div>
    <div class="table-toolbar__actions">
      <slot />
      <a-tooltip title="刷新数据">
        <a-button :loading="loading" aria-label="刷新" @click="$emit('refresh')">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
      </a-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ReloadOutlined } from '@ant-design/icons-vue';

withDefaults(defineProps<{
  total?: number;
  updatedAt?: string;
  loading?: boolean;
}>(), {
  total: 0,
  updatedAt: '',
  loading: false,
});

defineEmits<{
  refresh: [];
}>();
</script>
