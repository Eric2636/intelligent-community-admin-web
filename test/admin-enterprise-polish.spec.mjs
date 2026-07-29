import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), 'utf8');
}

const enterprisePages = [
  'UsersView.vue',
  'AdminsView.vue',
  'MiniModuleEntryView.vue',
  'MallCategoriesView.vue',
  'SystemNoticePublishView.vue',
  'ApiEndpointsView.vue',
  'SystemLogsView.vue',
  'ApiAccessLogsView.vue',
  'MiniApiErrorLogsView.vue',
  'ContentView.vue',
];

test('环境信息以图标和悬浮说明显示在管理员账号附近', async () => {
  const app = await source('src/App.vue');
  const indicator = await source('src/components/admin/EnvironmentIndicator.vue');

  assert.match(app, /<EnvironmentIndicator/);
  assert.match(app, /class="header-actions"/);
  assert.match(indicator, /a-tooltip/);
  assert.match(indicator, /本地开发环境/);
  assert.match(indicator, /测试环境/);
  assert.doesNotMatch(app, /\{\{\s*environmentLabel\s*\}\}/);
});

test('单条件搜索页面统一使用紧凑搜索工具栏', async () => {
  for (const name of ['UsersView.vue', 'AdminsView.vue']) {
    const view = await source(`src/views/${name}`);
    assert.match(view, /<CompactSearchBar/);
    assert.doesNotMatch(view, /toolbar--filters/);
  }
});

test('包含选择条件的页面使用带标签的筛选面板', async () => {
  for (const name of ['ContentView.vue', 'SystemLogsView.vue', 'MiniApiErrorLogsView.vue']) {
    const view = await source(`src/views/${name}`);
    assert.match(view, /<FilterPanel/);
    assert.match(view, /filter-field__label/);
  }
});

test('所有后台业务页面均使用统一页面标题', async () => {
  for (const name of enterprisePages) {
    assert.match(await source(`src/views/${name}`), /<PageHeader/, `${name} should render PageHeader`);
  }
});

test('账号和内容列表使用明确文字操作而不是状态开关', async () => {
  for (const name of ['UsersView.vue', 'AdminsView.vue']) {
    assert.doesNotMatch(await source(`src/views/${name}`), /<a-switch/);
  }

  const content = await source('src/views/ContentView.vue');
  assert.match(content, /上架/);
  assert.match(content, /下架/);
  assert.match(content, /置顶/);
  assert.match(content, /取消置顶/);
  assert.match(content, /删除/);
});

test('接口日志设置使用带标签的筛选面板并保留失败回滚', async () => {
  const view = await source('src/views/ApiEndpointsView.vue');

  assert.match(view, /<FilterPanel/);
  assert.match(view, />关键词</);
  assert.match(view, />来源</);
  assert.match(view, /endpoint\.logEnabled\s*=\s*previousValue/);
});

test('内容列表将状态展示与上架置顶操作分离', async () => {
  const view = await source('src/views/ContentView.vue');

  assert.match(view, /record\.visibility === 'ONLINE' \? '已上架' : '已下架'/);
  assert.match(view, /record\.visibility === 'ONLINE' \? '下架' : '上架'/);
  assert.match(view, /record\.pinned \? '取消置顶' : '置顶'/);
  assert.match(view, /toggleVisibility\(record\.id, record\.visibility !== 'ONLINE'\)/);
  assert.match(view, /togglePinnedById\(record\.id\)/);
});

test('核心列表请求失败后清理旧结果并提供重新加载', async () => {
  for (const name of [
    'UsersView.vue',
    'AdminsView.vue',
    'ContentView.vue',
    'SystemLogsView.vue',
    'ApiAccessLogsView.vue',
    'MiniApiErrorLogsView.vue',
  ]) {
    const view = await source(`src/views/${name}`);
    assert.match(view, /loadError/);
    assert.match(view, /rows\.value\s*=\s*\[\]/);
    assert.match(view, /pagination\.total\s*=\s*0/);
    assert.match(view, /重新加载/);
  }
});
