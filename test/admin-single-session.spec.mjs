import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('session replacement bypasses refresh, clears storage, notifies once and returns to login', () => {
  const source = readFileSync('src/api/admin.ts', 'utf8');
  const replacedBranch = source.indexOf("reason === 'session_replaced'");
  const genericUnauthorized = source.indexOf('if (error?.response?.status === 401)');

  assert.ok(replacedBranch > 0, 'missing session_replaced response branch');
  assert.ok(genericUnauthorized > replacedBranch, 'session replacement must be handled before refresh logic');
  assert.match(source, /let sessionReplacedHandled\s*=\s*false/);
  assert.match(source, /clearAdminSession\(\);[\s\S]*?if \(!sessionReplacedHandled\)/);
  assert.match(source, /message\.error\('账号已在其他设备登录，请重新登录'\)/);
  assert.match(source, /location\.href\s*=\s*appPath\('\/login'\)/);
});

test('a successful login resets the one-time replacement notification guard', () => {
  const source = readFileSync('src/api/admin.ts', 'utf8');
  const loginBlock = source.slice(source.indexOf('export async function login'), source.indexOf('export async function getLoginCaptcha'));

  assert.match(loginBlock, /sessionReplacedHandled\s*=\s*false/);
});

test('changing the current administrator password immediately returns to login', () => {
  const source = readFileSync('src/App.vue', 'utf8');
  const changePasswordBlock = source.slice(
    source.indexOf('async function submitChangePassword'),
    source.indexOf('function logout()', source.indexOf('async function submitChangePassword')),
  );

  assert.match(changePasswordBlock, /message\.success\('密码已修改，请重新登录'\)/);
  assert.match(changePasswordBlock, /logout\(\)/);
});
