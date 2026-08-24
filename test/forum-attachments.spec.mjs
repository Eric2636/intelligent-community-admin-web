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
