<template>
  <a-config-provider :theme="theme">
    <router-view v-if="isLoginPage" />
    <a-layout v-else class="app-shell">
    <a-layout-sider v-model:collapsed="collapsed" :collapsible="false" theme="dark" class="app-sider">
      <div class="sider-inner">
        <div class="logo">智慧社区后台</div>
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
        <a-sub-menu key="modules">
          <template #title>
            <AppstoreOutlined />
            <span>模块管理</span>
          </template>
              <a-menu-item key="/contents/errands">业主互助</a-menu-item>
              <a-menu-item key="/contents/posts">小区留言</a-menu-item>
              <a-menu-item key="/contents/items">小区市场</a-menu-item>
              <a-menu-item key="/contents/tasks">任务管理</a-menu-item>
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
        <span>{{ currentAdmin?.username }}</span>
        <a-button type="link" @click="logout">退出登录</a-button>
      </a-layout-header>
      <a-layout-content class="content">
        <router-view />
      </a-layout-content>
    </a-layout>
    </a-layout>
  </a-config-provider>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  AppstoreOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MobileOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';
import type { MenuProps } from 'ant-design-vue';
import type { AdminUser } from './types/api';

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

const currentAdmin = computed<AdminUser | null>(() => {
  const raw = localStorage.getItem('admin_user');
  return raw ? JSON.parse(raw) : null;
});
const isSuperAdmin = computed(() => currentAdmin.value?.role === 'SUPERADMIN');
const isLoginPage = computed(() => route.path === '/login');
const selectedKeys = computed(() => [route.path]);

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
