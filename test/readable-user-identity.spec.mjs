import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');

function source(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test('operator-facing pages use readable user identities instead of user IDs', () => {
  const admins = source('src/views/AdminsView.vue');
  const miniErrors = source('src/views/MiniApiErrorLogsView.vue');
  const accessLogs = source('src/views/ApiAccessLogsView.vue');
  const apiErrors = source('src/views/ApiErrorLogsView.vue');
  const content = source('src/views/ContentView.vue');

  assert.match(admins, /\{\{\s*u\.name\s*\|\|\s*'未命名用户'\s*\}\}/);
  assert.doesNotMatch(admins, /\+\s*'（'\s*\+\s*u\.id/);
  assert.match(miniErrors, /title:\s*'用户'/);
  assert.match(miniErrors, /detailRow\?\.userName\s*\|\|\s*'匿名用户'/);
  assert.doesNotMatch(miniErrors, /title:\s*'用户ID'/);
  assert.doesNotMatch(miniErrors, /userId:\s*row\.userId/);
  assert.match(accessLogs, /placeholder="请输入昵称或管理员账号"/);
  assert.doesNotMatch(accessLogs, /请输入用户 ID|请输入管理员 ID/);
  assert.match(apiErrors, /placeholder="请输入昵称或管理员账号"/);
  assert.doesNotMatch(apiErrors, /用户\/管理员 ID/);
  assert.match(content, /placeholder="发布者昵称"/);
  assert.doesNotMatch(content, /发布者用户 ID/);
  assert.doesNotMatch(content, /base\.actorUserId\s*=/);
});
