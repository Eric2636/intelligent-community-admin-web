<template>
  <div class="login-page">
    <a-card class="login-card">
      <div class="login-title">智慧社区后台</div>
      <div class="login-subtitle">腾讯云控制台风格</div>
      <a-form layout="vertical" :model="form" @finish="submit">
        <a-form-item label="管理员账号" name="username" :rules="[{ required: true, message: '请输入管理员账号' }]">
          <a-input v-model:value="form.username" />
        </a-form-item>
        <a-form-item label="密码" name="password" :rules="[{ required: true, message: '请输入密码' }]">
          <a-input-password v-model:value="form.password" />
        </a-form-item>
        <a-button type="primary" html-type="submit" block :loading="loading">登录</a-button>
      </a-form>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import { errorMessage, login } from '../api/admin';

const router = useRouter();
const loading = ref(false);
const form = reactive({ username: '', password: '' });

async function submit() {
  loading.value = true;
  try {
    const data = await login(form);
    localStorage.setItem('admin_token', data.token);
    localStorage.setItem('admin_user', JSON.stringify(data.admin));
    message.success('登录成功');
    router.push('/');
  } catch (error) {
    message.error(errorMessage(error));
  } finally {
    loading.value = false;
  }
}
</script>
