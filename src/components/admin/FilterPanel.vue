<template>
  <section class="filter-panel">
    <div class="filter-panel__fields">
      <slot />
    </div>
    <div v-if="$slots.advanced && expanded" class="filter-panel__advanced">
      <slot name="advanced" />
    </div>
    <div class="filter-panel__footer">
      <div class="filter-panel__actions">
        <slot name="actions" />
      </div>
      <a-button
        v-if="$slots.advanced"
        class="filter-panel__toggle"
        type="link"
        size="small"
        @click="expanded = !expanded"
      >
        {{ expanded ? '收起筛选' : '更多筛选' }}
        <UpOutlined v-if="expanded" />
        <DownOutlined v-else />
      </a-button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { DownOutlined, UpOutlined } from '@ant-design/icons-vue';

const expanded = ref(false);
</script>
