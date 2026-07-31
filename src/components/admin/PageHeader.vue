<template>
  <section class="page-header">
    <div class="page-header__main">
      <a-breadcrumb v-if="breadcrumbs.length" class="page-header__breadcrumb">
        <a-breadcrumb-item v-for="item in breadcrumbs" :key="item">{{ item }}</a-breadcrumb-item>
      </a-breadcrumb>
      <h1 class="page-header__title">{{ title }}</h1>
      <p v-if="description" class="page-header__description">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="page-header__actions">
      <slot name="actions" />
    </div>
  </section>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title: string;
  description?: string;
  breadcrumbs?: string[];
}>(), {
  description: '',
  breadcrumbs: () => [],
});
</script>
