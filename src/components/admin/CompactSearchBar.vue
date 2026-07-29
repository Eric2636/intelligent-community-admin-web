<template>
  <div class="toolbar compact-search-bar">
    <a-input-search
      v-model:value="value"
      :placeholder="placeholder"
      allow-clear
      @search="$emit('search')"
    />
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  modelValue: string;
  placeholder?: string;
}>(), {
  placeholder: '请输入关键词',
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  search: [];
}>();

const value = computed({
  get: () => props.modelValue,
  set: (next: string) => emit('update:modelValue', next),
});
</script>
