import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('form modals use explicit Chinese confirm and cancel text instead of component defaults', () => {
  for (const file of [
    'src/App.vue',
    'src/views/AdminsView.vue',
    'src/views/ContentView.vue',
    'src/views/ApiEndpointsView.vue',
    'src/views/MallCategoriesView.vue',
    'src/views/UsersView.vue',
  ]) {
    const view = source(file);
    assert.match(view, /ok-text="确认"/, `${file} 缺少明确的确认按钮文案`);
    assert.match(view, /cancel-text="取消"/, `${file} 缺少明确的取消按钮文案`);
  }
});

test('programmatic confirmations explicitly use Chinese cancel text', () => {
  for (const file of [
    'src/views/AdminsView.vue',
    'src/views/UsersView.vue',
    'src/views/DatabaseManagementView.vue',
    'src/views/ContentView.vue',
    'src/views/ApiEndpointsView.vue',
    'src/views/MallCategoriesView.vue',
    'src/views/SystemNoticePublishView.vue',
  ]) {
    const view = source(file);
    const confirmCalls = view.match(/Modal\.confirm\(/g) || [];
    const cancelTexts = view.match(/cancelText:\s*'取消'/g) || [];
    assert.ok(cancelTexts.length >= confirmCalls.length, `${file} 存在未明确中文化的确认弹窗`);
  }
});
