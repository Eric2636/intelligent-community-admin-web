<template>
  <div class="admin-page notice-page">
    <PageHeader
      title="系统通知"
      description="向当前所有已启用的小程序用户发布平台通知。"
      :breadcrumbs="['运营管理', '系统通知']"
    />
    <a-card class="notice-card">
      <a-alert
        type="info"
        show-icon
        class="scope-alert"
        message="预计发送范围"
        description="通知将发送给当前所有已启用用户。已禁用用户不会收到，发布后暂不支持撤回。"
      />

      <a-form layout="vertical">
        <a-form-item label="通知标题" required>
          <a-input
            v-model:value="form.title"
            :maxlength="191"
            show-count
            placeholder="请输入通知标题"
          />
        </a-form-item>
        <a-form-item label="通知内容" required>
          <a-textarea
            v-model:value="form.content"
            :maxlength="65535"
            :auto-size="{ minRows: 8, maxRows: 16 }"
            show-count
            placeholder="请输入通知内容；内容将按纯文本展示"
          />
          <div class="field-help">内容按纯文本发送，最多 65535 个 UTF-8 字节。</div>
        </a-form-item>
        <a-form-item class="actions">
          <a-button
            type="primary"
            :loading="publishing"
            :disabled="!currentAdmin?.id"
            @click="submit"
          >
            发布通知
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { Modal, message } from 'ant-design-vue';
import { errorMessage, publishSystemNotice } from '../api/admin';
import { useAdminFromStorage } from '../composables/use-admin-from-storage';
import { createSystemNoticeIntentStore } from '../utils/system-notice-intent';
import PageHeader from '../components/admin/PageHeader.vue';

const currentAdmin = useAdminFromStorage();
const intentStore = createSystemNoticeIntentStore(
  sessionStorage,
  currentAdmin.value?.id,
);
const savedIntent = intentStore.load();
const form = reactive({
  title: savedIntent?.title ?? '',
  content: savedIntent?.content ?? '',
});
const publishing = ref(false);

watch(
  () => [form.title, form.content] as const,
  ([title, content]) => {
    if (!title && !content) {
      intentStore.clear();
      return;
    }
    intentStore.update(title, content);
  },
);

function confirmPublish(title: string): Promise<boolean> {
  return new Promise((resolve) => {
    Modal.confirm({
      title: '二次确认',
      content: `确认向当前所有已启用用户发布“${title}”吗？发布后暂不支持撤回。`,
      okText: '确认发布',
      cancelText: '取消',
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });
}

async function submit() {
  if (publishing.value) return;
  if (!currentAdmin.value?.id) {
    message.error('管理员身份无效，请重新登录');
    return;
  }
  const title = form.title.trim();
  const content = form.content.trim();
  if (!title) {
    message.warning('请输入通知标题');
    return;
  }
  if (!content) {
    message.warning('请输入通知内容');
    return;
  }

  publishing.value = true;
  try {
    const confirmed = await confirmPublish(title);
    if (!confirmed) return;
    const intent = intentStore.update(title, content);
    const result = await publishSystemNotice({
      title,
      content,
      clientRequestId: intent.clientRequestId,
    });
    message.success(`发布成功，已发送给 ${result.recipientCount} 位用户`);
    intentStore.clear();
    form.title = '';
    form.content = '';
  } catch (error) {
    message.error(errorMessage(error));
  } finally {
    publishing.value = false;
  }
}
</script>

<style scoped>
.notice-page {
  max-width: 760px;
  margin: 0 auto;
}

.notice-card {
  border-radius: 4px;
}

.scope-alert {
  margin-bottom: 24px;
}

.field-help {
  margin-top: 6px;
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.actions {
  margin-bottom: 0;
}
</style>
