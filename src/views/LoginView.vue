<template>
  <div class="login-page">
    <a-card class="login-card">
      <div class="login-title">智慧社区</div>
      <div class="login-subtitle">腾讯云控制台风格</div>
      <a-form layout="vertical" :model="form" @finish="submit">
        <a-form-item label="管理员账号" name="username" :rules="[{ required: true, message: '请输入管理员账号' }]">
          <a-input v-model:value="form.username" />
        </a-form-item>
        <a-form-item label="密码" name="password" :rules="[{ required: true, message: '请输入密码' }]">
          <a-input-password v-model:value="form.password" />
        </a-form-item>
        <a-form-item v-if="needCaptcha" label="验证码" required>
          <div class="captcha-row">
            <a-input v-model:value="form.captchaCode" placeholder="请输入验证码" style="flex: 1" />
            <div class="captcha-img" @click="refreshCaptcha" v-html="captchaSvg"></div>
          </div>
          <div class="captcha-hint">密码输错后需要验证码；点击图片可刷新。</div>
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
import axios from 'axios';
import { errorMessage, getLoginCaptcha, login } from '../api/admin';

const router = useRouter();
const loading = ref(false);
const needCaptcha = ref(false);
const captchaSvg = ref('');
const captchaId = ref('');
const form = reactive({ username: '', password: '', captchaCode: '' });

async function refreshCaptcha() {
  const data = await getLoginCaptcha();
  captchaSvg.value = data.svg;
  captchaId.value = data.captchaId;
}

async function submit() {
  loading.value = true;
  try {
    const payload: any = { username: form.username, password: form.password };
    if (needCaptcha.value) {
      payload.captchaId = captchaId.value;
      payload.captchaCode = form.captchaCode;
    }
    const data = await login(payload);
    localStorage.setItem('admin_token', data.token);
    localStorage.setItem('admin_user', JSON.stringify(data.admin));
    message.success('登录成功');
    router.push('/');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const body: any = error.response?.data;
      if (body?.lockUntil) {
        message.error(body?.message || '登录被限制，请稍后再试');
        return;
      }
      if (body?.needCaptcha) {
        needCaptcha.value = true;
        if (!captchaId.value) {
          try {
            await refreshCaptcha();
          } catch {
            // ignore
          }
        }
      }
    }
    message.error(errorMessage(error));
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.captcha-row {
  display: flex;
  gap: 12px;
  align-items: center;
}
.captcha-img {
  width: 120px;
  height: 40px;
  cursor: pointer;
  user-select: none;
}
.captcha-img :deep(svg) {
  width: 120px;
  height: 40px;
  display: block;
}
.captcha-hint {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}
</style>
