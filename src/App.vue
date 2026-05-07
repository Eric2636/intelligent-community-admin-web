<template>
  <a-config-provider :theme="theme">
    <router-view v-if="isLoginPage" />
    <a-layout v-else class="app-shell">
    <a-layout-sider v-model:collapsed="collapsed" :collapsible="false" theme="dark" class="app-sider">
      <div class="sider-inner">
        <div class="logo">智慧社区</div>
        <div class="sider-menu-wrap">
          <a-menu
            theme="dark"
            mode="inline"
            :selectedKeys="selectedKeys"
            v-model:openKeys="openKeys"
            @click="handleMenuClick"
          >
            <a-menu-item key="/users">
              <UserOutlined />
              <span>用户管理</span>
            </a-menu-item>
            <a-menu-item v-if="isSuperAdmin" key="/admins">
              <TeamOutlined />
              <span>管理员管理</span>
            </a-menu-item>
            <a-menu-item v-if="isSuperAdmin" key="/mini-modules">
              <MobileOutlined />
              <span>小程序模块开关</span>
            </a-menu-item>
            <a-menu-item v-if="isSuperAdmin" key="/system-logs">
              <FileSearchOutlined />
              <span>系统日志</span>
            </a-menu-item>
            <a-sub-menu key="modules">
              <template #title>
                <AppstoreOutlined />
                <span>模块管理</span>
              </template>
              <a-menu-item key="/contents/posts">小区留言</a-menu-item>
              <a-menu-item key="/contents/items">小区市场</a-menu-item>
              <a-menu-item key="/contents/tasks">业主互助</a-menu-item>
            </a-sub-menu>
          </a-menu>
        </div>
        <div class="sider-footer">
          <div class="sider-trigger" :class="{ collapsed: collapsed }" @click="toggleCollapsed">
            <component :is="collapsed ? MenuUnfoldOutlined : MenuFoldOutlined" />
            <span v-if="!collapsed">收起菜单</span>
          </div>
        </div>
      </div>
    </a-layout-sider>
    <a-layout>
      <a-layout-header class="header">
        <div class="header-actions">
          <a-dropdown placement="bottomRight" trigger="click">
            <button class="console-account" type="button">
              <span class="account-avatar">{{ adminInitial }}</span>
              <span class="account-meta">
                <span class="admin-username">{{ currentAdmin?.username }}</span>
                <span class="admin-role">{{ adminRoleLabel }}</span>
              </span>
              <DownOutlined class="account-arrow" />
            </button>
            <template #overlay>
              <a-menu class="account-menu">
                <a-menu-item key="password" @click="openChangePassword">
                  <LockOutlined />
                  <span>修改密码</span>
                </a-menu-item>
                <a-menu-divider />
                <a-menu-item key="logout" danger @click="logout">
                  <LogoutOutlined />
                  <span>退出登录</span>
                </a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
        </div>
      </a-layout-header>
      <a-layout-content class="content">
        <router-view />
      </a-layout-content>

      <a-modal
        v-model:open="changePwdOpen"
        title="修改密码"
        :confirm-loading="changePwdSaving"
        @ok="submitChangePassword"
        destroy-on-close
      >
        <a-form layout="vertical">
          <a-form-item label="新密码" required>
            <a-input-password v-model:value="changePwdForm.password" placeholder="不少于 6 位" />
          </a-form-item>
          <a-form-item label="确认新密码" required>
            <a-input-password v-model:value="changePwdForm.password2" />
          </a-form-item>
        </a-form>
      </a-modal>
    </a-layout>
    </a-layout>
  </a-config-provider>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  AppstoreOutlined,
  DownOutlined,
  FileSearchOutlined,
  LockOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MobileOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import type { MenuProps } from 'ant-design-vue';
import { useAdminFromStorage } from './composables/use-admin-from-storage';
import { changeMyPassword } from './api/admin';

const route = useRoute();
const router = useRouter();
const collapsed = ref(false);
const openKeys = ref<string[]>(['modules']);
const theme = {
  token: {
    colorPrimary: '#0052d9',
    colorInfo: '#0052d9',
    colorSuccess: '#00a870',
    colorWarning: '#ed7b2f',
    colorError: '#e34d59',
    colorBgLayout: '#f2f3f5',
    colorTextBase: '#1f2329',
    borderRadius: 4,
    fontSize: 13,
    fontSizeSM: 12,
    fontSizeLG: 14,
    controlHeight: 32,
    controlHeightLG: 40,
    controlHeightSM: 28,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', Arial, sans-serif",
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      bodyBg: '#f2f3f5',
    },
    Menu: {
      darkItemBg: '#001b33',
      darkSubMenuItemBg: '#001b33',
      darkItemSelectedBg: '#0052d9',
      darkItemHoverBg: '#0a2d5c',
    },
    Sider: {
      triggerBg: '#001b33',
    },
    Card: {
      paddingLG: 24,
    },
  },
};

const currentAdmin = useAdminFromStorage();
const isSuperAdmin = computed(() => currentAdmin.value?.role === 'SUPERADMIN');
const adminRoleLabel = computed(() => (isSuperAdmin.value ? '超级管理员' : '普通管理员'));
const adminInitial = computed(() => currentAdmin.value?.username?.trim().slice(0, 1).toUpperCase() || 'A');
const isLoginPage = computed(() => route.path === '/login');
const selectedKeys = computed(() => [route.path]);

const changePwdOpen = ref(false);
const changePwdSaving = ref(false);
const changePwdForm = ref({ password: '', password2: '' });

watch(
  () => route.path,
  (path) => {
    if (path.startsWith('/contents/') && !collapsed.value && !openKeys.value.includes('modules')) {
      openKeys.value = [...openKeys.value, 'modules'];
    }
  },
  { immediate: true },
);

const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
  router.push(String(key));
};

function openChangePassword() {
  changePwdForm.value = { password: '', password2: '' };
  changePwdOpen.value = true;
}

async function submitChangePassword() {
  const p1 = changePwdForm.value.password.trim();
  const p2 = changePwdForm.value.password2.trim();
  if (p1.length < 6) {
    message.warning('密码至少 6 位');
    return Promise.reject();
  }
  if (p1 !== p2) {
    message.warning('两次输入的密码不一致');
    return Promise.reject();
  }
  changePwdSaving.value = true;
  try {
    await changeMyPassword(p1);
    message.success('密码已修改');
    changePwdOpen.value = false;
  } catch (e) {
    message.error(e instanceof Error ? e.message : '修改失败');
    return Promise.reject(e);
  } finally {
    changePwdSaving.value = false;
  }
}

function logout() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
  router.push('/login');
}

function toggleCollapsed() {
  collapsed.value = !collapsed.value;
  openKeys.value = collapsed.value ? [] : ['modules'];
}
</script>

<style scoped>
.header-actions {
  height: 100%;
  display: flex;
  align-items: center;
  margin-left: auto;
}

.console-account {
  border: 0;
  color: #1d2129;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    box-shadow 0.2s ease,
    color 0.2s ease;
}

.console-account {
  height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  border: 1px solid #d9e3f0;
  border-radius: 4px;
  background: #f7fbff;
}

.console-account:hover {
  background: #eef6ff;
  border-color: #9cc5ff;
  box-shadow: 0 2px 6px rgba(0, 82, 217, 0.12);
}

.account-avatar {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #e8f1ff;
  color: #0052d9;
  font-size: 13px;
  font-weight: 600;
}

.account-meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  line-height: 1.2;
}

.admin-username {
  font-weight: 600;
  color: #0052d9;
  font-size: 13px;
  max-width: 128px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-role {
  color: #4e5969;
  font-size: 12px;
}

.account-arrow {
  color: #0052d9;
  font-size: 10px;
}

.account-menu :deep(.ant-dropdown-menu-item) {
  min-width: 132px;
  gap: 8px;
}
</style>
