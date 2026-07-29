import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), 'utf8');
}

test('后台框架在长列表滚动时固定顶部栏和侧边栏', async () => {
  const css = await source('src/style.css');

  assert.match(css, /\.app-sider\s*\{[^}]*position:\s*sticky;/s);
  assert.match(css, /\.app-sider\s*\{[^}]*height:\s*100vh;/s);
  assert.match(css, /\.ant-layout-sider\.app-sider\s*\{[^}]*position:\s*sticky\s*!important;/s);
  assert.match(css, /\.header\s*\{[^}]*position:\s*sticky;/s);
  assert.match(css, /\.ant-layout-header\.header\s*\{[^}]*height:\s*56px\s*!important;/s);
});

test('用户管理使用紧凑搜索栏和明确的冻结解冻操作', async () => {
  const view = await source('src/views/UsersView.vue');

  assert.match(view, /<CompactSearchBar/);
  assert.match(view, /record\.enabled \? '冻结' : '解冻'/);
  assert.match(view, /column\.key === 'disabledReason'/);
  assert.doesNotMatch(view, /<a-switch/);
  assert.match(view, /:sticky="\{ offsetHeader: 56 \}"/);
});

test('全局顶部栏不重复显示当前页面标题', async () => {
  const app = await source('src/App.vue');

  assert.doesNotMatch(app, /header-page-title/);
});
