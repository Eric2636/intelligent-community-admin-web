import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (file) => readFile(new URL(`../${file}`, import.meta.url), 'utf8');

test('database management is one super-admin menu and one protected route', async () => {
  const [app, router] = await Promise.all([read('src/App.vue'), read('src/router/index.ts')]);
  assert.match(app, /v-if="isSuperAdmin" key="\/database"/);
  assert.match(app, />数据库管理</);
  assert.match(router, /path: '\/database'.*superAdminOnly: true/);
});

test('database page has only backup management and table structure tabs', async () => {
  const view = await read('src/views/DatabaseManagementView.vue');
  assert.match(view, /备份管理/);
  assert.match(view, /数据表/);
  assert.match(view, /手动备份/);
  assert.match(view, /自动备份/);
  assert.match(view, /字段结构/);
  assert.doesNotMatch(view, /运营首页|恢复备份|下载备份|执行 SQL|业务数据/);
});

test('database admin client exposes settings, jobs and read-only structure calls', async () => {
  const api = await read('src/api/admin.ts');
  assert.match(api, /getDatabaseBackupSetting/);
  assert.match(api, /updateDatabaseBackupSetting/);
  assert.match(api, /createDatabaseBackup/);
  assert.match(api, /listDatabaseBackupJobs/);
  assert.match(api, /listDatabaseTables/);
  assert.match(api, /getDatabaseTableStructure/);
  assert.match(api, /getDatabaseBackupOverview/);
  assert.match(api, /keyword/);
});

test('database page fails closed and exposes professional task and structure details', async () => {
  const view = await read('src/views/DatabaseManagementView.vue');
  assert.match(view, /settingLoaded/);
  assert.match(view, /settingError/);
  assert.match(view, /jobsError/);
  assert.match(view, /tablesError/);
  assert.match(view, /getDatabaseBackupOverview/);
  assert.match(view, /scheduledAt/);
  assert.match(view, /durationMs/);
  assert.match(view, /requestedByAdminUsername/);
  assert.match(view, /搜索表名、所属模块或用途说明/);
  assert.match(view, /structure\.indexes/);
});
