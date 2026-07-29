import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');

function source(relativePath) {
  const file = path.join(root, relativePath);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

test('log center groups the three log entries while API monitoring routes remain super-admin only', () => {
  const router = source('src/router/index.ts');
  const app = source('src/App.vue');

  for (const route of ['/api-endpoints', '/api-access-logs', '/api-error-logs']) {
    assert.match(
      router,
      new RegExp(`path:\\s*['"]${route}['"][\\s\\S]{0,180}superAdminOnly:\\s*true`),
    );
  }
  assert.match(app, /a-sub-menu v-if="isSuperAdmin" key="log-center"/);
  for (const label of ['操作审计', '接口监控', '小程序异常上报']) assert.match(app, new RegExp(label));
  assert.match(app, /key="\/api-endpoints"/);
});

test('endpoint management supports modal description editing and confirmed switch rollback', () => {
  const view = source('src/views/ApiEndpointsView.vue');

  assert.match(view, /描述/);
  assert.match(view, /日志开关/);
  assert.match(view, /业务模块/);
  assert.match(view, /接口名称/);
  assert.match(view, /近 24 小时/);
  assert.match(view, /a-modal/);
  assert.match(view, /Modal\.confirm\s*\(/);
  assert.match(view, /updateApiEndpoint\s*\(/);
  assert.match(view, /catch[\s\S]{0,240}logEnabled/);
});

test('operation audit uses Chinese action labels instead of internal action codes', () => {
  const view = source('src/views/SystemLogsView.vue');
  assert.match(view, /const actionLabels: Record<string, string>/);
  assert.match(view, /管理员登录/);
  assert.match(view, /修改接口日志开关/);
  assert.match(view, /修改内容置顶状态/);
  assert.match(view, /修改后台数据/);
  assert.match(view, /访问地址/);
  assert.match(view, /请求地址/);
  assert.match(view, /type="link" size="small" @click="copyAddress"/);
  assert.match(view, /requestAddress/);
  assert.match(view, /actionLabel\(record\.action\)/);
  for (const label of ['业务模块', '业务对象', '执行结果', '请求参数', '修改前', '修改后']) {
    assert.match(view, new RegExp(label));
  }
});

test('access logs expose complete filters, two source tabs, reset and current-filter export', () => {
  const view = source('src/views/ApiAccessLogsView.vue');

  for (const label of ['IP', '接口', '方法', '状态', '调用时间', '用户/管理员', '耗时']) {
    assert.match(view, new RegExp(label));
  }
  assert.match(view, /@pressEnter="[^"]+"/);
  assert.match(view, /pagination\.current\s*=\s*1/);
  assert.match(view, /重置/);
  assert.match(view, /导出当前筛选结果/);
  assert.match(view, /exportApiAccessLogs\s*\(/);
  assert.match(view, /tab="微信小程序"/);
  assert.match(view, /tab="后台管理"/);
  assert.doesNotMatch(view, /错误记录（4xx \/ 5xx）/);
  assert.match(view, /actorLabel/);
  assert.doesNotMatch(view, /title: '标准路由'/);
  assert.doesNotMatch(view, /title: '脱敏路径'/);
  assert.doesNotMatch(view, /title: 'IP'/);
  assert.doesNotMatch(view, /title: '用户\/管理员'/);
  assert.doesNotMatch(view, /title: '业务码'/);
  assert.match(view, /:sticky="\{ offsetHeader: 56 \}"/);
  for (const label of ['请求编号', '访问 IP', '调用人', '业务码', '请求参数']) {
    assert.match(view, new RegExp(label));
  }
});

test('mini-program exception details expose the real URL, request data and a contextual copy action', () => {
  const view = source('src/views/MiniApiErrorLogsView.vue');

  assert.match(view, /record\.url \|\| record\.path/);
  assert.match(view, /请求地址/);
  assert.match(view, /请求参数/);
  assert.match(view, /copyRequestUrl/);
  assert.match(view, /复制地址/);
  assert.doesNotMatch(view, />复制<\/a-button>/);
});

test('error logs include 4xx and 5xx, export current filters, and show sanitized request snapshots only in details', () => {
  const view = source('src/views/ApiErrorLogsView.vue');

  assert.match(view, /const filters = reactive<FilterModel>\(\{\}\)/);
  assert.match(view, /导出当前筛选结果/);
  assert.match(view, /exportApiErrorLogs\s*\(\s*requestFilters\s*\(\s*\)\s*\)/);
  assert.match(view, /URL\.createObjectURL\(blob\)/);
  assert.match(view, /errorSummary/);
  assert.match(view, /脱敏错误摘要/);
  assert.match(view, /请求参数（已脱敏）/);
  assert.match(view, /历史记录未采集请求参数/);
  assert.match(view, /requestSnapshot/);
  assert.match(view, /访问记录/);
  assert.match(view, /actorLabel/);
  assert.doesNotMatch(view, /requestBody|requestHeaders|authorization|token/i);
});

test('API client and serializable log types cover list, update and export endpoints', () => {
  const api = source('src/api/admin.ts');
  const types = source('src/types/api.ts');

  assert.match(api, /http\.get\(\s*['"]\/api\/admin\/api-endpoints['"]/);
  assert.match(api, /http\.patch\(\s*`\/api\/admin\/api-endpoints\/\$\{id\}`/);
  assert.match(api, /http\.get\(\s*['"]\/api\/admin\/api-access-logs['"]/);
  assert.match(api, /http\.get\(\s*['"]\/api\/admin\/api-error-logs['"]/);
  assert.match(api, /\/api\/admin\/api-access-logs\/export/);
  assert.match(api, /\/api\/admin\/api-error-logs\/export/);
  assert.match(api, /exportApiErrorLogs/);
  assert.match(types, /export type ApiEndpoint/);
  assert.match(types, /export type ApiAccessLog/);
  assert.match(types, /export type ApiErrorLog/);
  assert.match(types, /requestSnapshot\?: Record<string, unknown> \| null/);
  assert.match(types, /actorLabel\?: string/);
  assert.match(types, /id:\s*string/);
});
