import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');

function source(relativePath) {
  const file = path.join(root, relativePath);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

test('admin shell exposes the current page and runtime environment', () => {
  const app = source('src/App.vue');
  const router = source('src/router/index.ts');

  assert.match(app, /class="header-page-context"/);
  assert.match(app, /currentRouteTitle/);
  assert.match(app, /<EnvironmentIndicator/);
  assert.match(router, /meta:\s*\{[\s\S]{0,180}title:/);
});

test('shared admin components establish one page, filter and table toolbar structure', () => {
  const pageHeader = source('src/components/admin/PageHeader.vue');
  const filterPanel = source('src/components/admin/FilterPanel.vue');
  const tableToolbar = source('src/components/admin/TableToolbar.vue');

  assert.match(pageHeader, /page-header/);
  assert.match(pageHeader, /page-header__title/);
  assert.match(pageHeader, /page-header__description/);
  assert.match(pageHeader, /<slot name="actions"/);

  assert.match(filterPanel, /filter-panel/);
  assert.match(filterPanel, /更多筛选/);
  assert.match(filterPanel, /收起筛选/);
  assert.match(filterPanel, /<slot name="advanced"/);

  assert.match(tableToolbar, /共[\s\S]*条/);
  assert.match(tableToolbar, /最近更新/);
  assert.match(tableToolbar, /刷新/);
});

test('all administrator pages use a page header with business context', () => {
  for (const fileName of [
    'UsersView.vue',
    'AdminsView.vue',
    'ContentView.vue',
    'MallCategoriesView.vue',
    'MiniModuleEntryView.vue',
    'ApiEndpointsView.vue',
    'ApiAccessLogsView.vue',
    'SystemLogsView.vue',
    'MiniApiErrorLogsView.vue',
    'SystemNoticePublishView.vue',
  ]) {
    const view = source(`src/views/${fileName}`);
    assert.match(view, /<PageHeader/, `${fileName} should render PageHeader`);
  }
});

test('login page uses formal product copy instead of a development-style reference', () => {
  const login = source('src/views/LoginView.vue');
  assert.match(login, /智慧社区管理平台/);
  assert.doesNotMatch(login, /腾讯云控制台风格/);
});

test('API monitor uses labeled common filters, advanced filters and a detail drawer', () => {
  const view = source('src/views/ApiAccessLogsView.vue');

  for (const label of ['接口', '请求方法', '响应状态', '调用时间', 'IP 地址', '用户/管理员', '请求耗时']) {
    assert.match(view, new RegExp(`label="${label}"`));
  }
  assert.match(view, /<FilterPanel/);
  assert.match(view, /#advanced/);
  assert.match(view, /<TableToolbar/);
  assert.match(view, /<a-drawer/);
  assert.match(view, /请求详情/);
  assert.match(view, /复制地址/);
  assert.match(view, /openDetail\(record\)/);
});
