import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (file) => readFile(path.join(root, file), 'utf8');

test('admin content editor supports five 20MB attachments and complete edit payload', async () => {
  const source = await read('src/views/ContentView.vue');
  assert.match(source, /最多5个，单个不超过20MB/);
  assert.match(source, /editForm\.attachments\.map/);
  assert.match(source, /checkAdminForumAttachment/);
  assert.match(source, /uploadAdminForumAttachment/);
  assert.match(source, /附件上传中，请等待上传完成后再保存/);
});

test('admin attachment client uses SHA-256 preflight and whitelist validation', async () => {
  const util = await read('src/utils/forumAttachment.ts');
  const nginx = await read('nginx.conf.template');
  assert.match(util, /SHA-256/);
  assert.match(util, /20 \* 1024 \* 1024/);
  assert.match(nginx, /client_max_body_size 25m/);
});

test('forum table keeps announcement tag and adds extensible activity type and registration actions', async () => {
  const source = await read('src/views/ContentView.vue');
  assert.match(source, /record\.postType === 'ANNOUNCEMENT'[\s\S]*>公告</);
  assert.match(source, /title: '活动类型'/);
  assert.match(source, /forumActivityPresentation/);
  assert.match(source, />查看报名人员</);
  assert.match(source, /已报名人数/);
  assert.match(source, /报名截止时间/);
  assert.match(source, /报名中|已满|已截止/);
});

test('registration drawer clears stale data and uses latest-request-wins with retry states', async () => {
  const source = await read('src/views/ContentView.vue');
  const api = await read('src/api/admin.ts');
  assert.match(api, /registration-entries/);
  assert.match(source, /registrationEntries\.value = \[\]/);
  assert.match(source, /registrationError/);
  assert.match(source, /createRegistrationEntriesLoader/);
  assert.match(source, /重新加载/);
  assert.match(source, /暂无人报名/);
});

test('every active backend admin can create a forum post without a mini-program binding', async () => {
  const source = await read('src/views/ContentView.vue');
  assert.match(source, /canCreateContent = computed\(\(\) =>[\s\S]*adminRef\.value\?\.enabled !== false/);
  assert.doesNotMatch(source, /canCreateContent = computed\(\(\) => Boolean\(boundUserId\.value\)\)/);
});
