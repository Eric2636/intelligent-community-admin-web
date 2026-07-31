<template>
  <a-tooltip v-if="mode !== 'production'" :title="tooltip">
    <span
      class="environment-indicator"
      :class="`environment-indicator--${mode}`"
      :aria-label="tooltip"
    >
      <CodeOutlined v-if="mode === 'local'" />
      <ExperimentOutlined v-else />
    </span>
  </a-tooltip>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { CodeOutlined, ExperimentOutlined } from '@ant-design/icons-vue';

const mode = import.meta.env.PROD
  ? 'production'
  : import.meta.env.MODE === 'test'
    ? 'test'
    : 'local';
const tooltip = computed(() => (mode === 'test' ? '测试环境' : '本地开发环境'));
</script>

<style scoped>
.environment-indicator {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: help;
  font-size: 14px;
}

.environment-indicator--local {
  border-color: #b9d5ff;
  background: #edf5ff;
  color: #0052d9;
}

.environment-indicator--test {
  border-color: #f5c79e;
  background: #fff4e8;
  color: #b95000;
}
</style>
