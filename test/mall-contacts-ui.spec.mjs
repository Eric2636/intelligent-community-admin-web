import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/views/ContentView.vue', import.meta.url), 'utf8');

test('后台市场商品表单和详情按微信号、手机号管理联系方式', () => {
  assert.match(source, /label="微信号"/);
  assert.match(source, /label="手机号"/);
  assert.match(source, /editForm\.wechatContact/);
  assert.match(source, /editForm\.phoneContact/);
  assert.match(source, /手机号也是微信号/);
  assert.match(source, /phoneIsWechat/);
  assert.doesNotMatch(source, /label="联系方式"/);
});
