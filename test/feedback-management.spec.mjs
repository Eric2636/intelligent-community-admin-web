import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');

function source(relativePath) {
  const file = path.join(root, relativePath);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

test('feedback management API and response types are defined', () => {
  const api = source('src/api/admin.ts');
  const types = source('src/types/api.ts');
  assert.match(types, /export type AdminFeedback\s*=\s*\{/);
  for (const field of ['nickname', 'avatar', 'userTagLabel', 'content', 'createdAt']) {
    assert.match(types, new RegExp(`${field}:\\s*string`));
  }
  assert.match(types, /userTagType:\s*'owner'\s*\|\s*'outsider'\s*\|\s*'admin'\s*\|\s*''/);
  assert.match(api, /export async function listAdminFeedbacks\s*\(/);
  assert.match(api, /http\.get\(\s*['"]\/api\/admin\/feedbacks['"]/);
});

test('feedback menu and route are available to both super and platform administrators', () => {
  const app = source('src/App.vue');
  const router = source('src/router/index.ts');
  assert.match(app, /key="\/feedbacks"/);
  assert.match(app, />\s*意见反馈\s*</);
  assert.doesNotMatch(app, /v-if="isSuperAdmin"[^>]*key="\/feedbacks"/);
  assert.match(
    router,
    /\{\s*path:\s*['"]\/feedbacks['"],\s*component:\s*FeedbacksView,\s*meta:\s*\{\s*title:\s*['"]意见反馈['"]\s*\}\s*\}/,
  );
});

test('feedback page is a read-only card list with the confirmed filters', () => {
  const view = source('src/views/FeedbacksView.vue');
  assert.match(view, /PageHeader/);
  assert.match(view, /FilterPanel/);
  assert.match(view, /a-list/);
  assert.match(view, /a-card/);
  assert.match(view, /a-avatar/);
  assert.match(view, /UserOutlined/);
  assert.match(view, /昵称或反馈内容/);
  assert.match(view, /OWNER/);
  assert.match(view, /OUTSIDER/);
  assert.match(view, /a-range-picker/);
  assert.match(view, /@pressEnter="submitSearch"/);
  assert.match(view, /查询/);
  assert.match(view, /重置/);
  assert.match(view, /@refresh="load\(\)"/);
  assert.match(view, /feedback\.nickname/);
  assert.match(view, /feedback\.content/);
  assert.match(view, /feedback\.userTagLabel/);
  assert.match(view, /feedback\.userTagType/);
  assert.match(view, /feedback\.createdAt/);
  assert.doesNotMatch(view, /处理状态|处理备注|删除反馈/);
});

test('feedback page clears stale cards after a failed request and resets page before searches', () => {
  const view = source('src/views/FeedbacksView.vue');
  assert.match(view, /onError:\s*\([^)]*\)\s*=>\s*\{[\s\S]*rows\.value\s*=\s*\[\]/);
  assert.match(view, /pagination\.total\s*=\s*0/);
  assert.match(view, /function submitSearch\(\)\s*\{[\s\S]*pagination\.current\s*=\s*1/);
  assert.match(view, /function resetFilters\(\)\s*\{[\s\S]*pagination\.current\s*=\s*1/);
});
