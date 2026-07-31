import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import { NodeTypes, baseParse } from '@vue/compiler-dom';
import { parse } from '@vue/compiler-sfc';

const root = path.resolve(import.meta.dirname, '..');

function source(relativePath) {
  const file = path.join(root, relativePath);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function readView() {
  const file = path.join(root, 'src/views/SystemNoticePublishView.vue');
  const text = source('src/views/SystemNoticePublishView.vue');
  const { descriptor } = parse(text, { filename: file });
  assert.ok(descriptor.template);
  assert.ok(descriptor.scriptSetup);
  return {
    source: text,
    template: baseParse(descriptor.template.content),
    script: descriptor.scriptSetup.content,
  };
}

function walk(node, visit) {
  visit(node);
  for (const child of node.children || []) walk(child, visit);
}

function elements(view, tag) {
  const result = [];
  walk(view.template, (node) => {
    if (node.type === NodeTypes.ELEMENT && node.tag === tag) result.push(node);
  });
  return result;
}

function prop(node, kind, name) {
  return node.props.find((candidate) => {
    if (kind === 'attribute') return candidate.type === NodeTypes.ATTRIBUTE && candidate.name === name;
    return (
      candidate.type === NodeTypes.DIRECTIVE &&
      candidate.name === kind &&
      candidate.arg?.type === NodeTypes.SIMPLE_EXPRESSION &&
      candidate.arg.content === name
    );
  });
}

function findFunction(script, name) {
  const ast = ts.createSourceFile('view.ts', script, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let found;
  ast.forEachChild((node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node;
  });
  return found;
}

async function importTranspiledTypeScript(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) return {};
  const output = ts.transpileModule(fs.readFileSync(filePath, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filePath,
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}#${Date.now()}`);
}

test('system notice API and response type are explicitly defined', () => {
  const api = source('src/api/admin.ts');
  const types = source('src/types/api.ts');
  assert.match(types, /export type PublishSystemNoticeResult\s*=\s*\{[\s\S]*noticeId:\s*string[\s\S]*recipientCount:\s*number/);
  assert.match(api, /export async function publishSystemNotice\s*\(/);
  assert.match(api, /http\.post\(\s*['"]\/api\/admin\/system-notices['"]/);
  assert.match(api, /PublishSystemNoticeResult/);
  assert.match(api, /clientRequestId:\s*string/);
});

test('publication intent id survives failure and reload, changes with edits, and clears after success', async () => {
  const module = await importTranspiledTypeScript('src/utils/system-notice-intent.ts');
  assert.equal(typeof module.createSystemNoticeIntentStore, 'function');
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const generated = ['secure_request_id_001', 'secure_request_id_002'];
  const firstStore = module.createSystemNoticeIntentStore(storage, 'admin-a', () => generated.shift());
  const first = firstStore.update('标题', '内容');
  assert.equal(first.clientRequestId, 'secure_request_id_001');
  assert.equal(firstStore.update('标题', '内容').clientRequestId, first.clientRequestId);

  const reloadedStore = module.createSystemNoticeIntentStore(storage, 'admin-a', () => generated.shift());
  assert.deepEqual(reloadedStore.load(), first, 'a failed or timed-out intent must survive reload');
  const edited = reloadedStore.update('新标题', '内容');
  assert.equal(edited.clientRequestId, 'secure_request_id_002');
  assert.notEqual(edited.clientRequestId, first.clientRequestId);
  reloadedStore.clear();
  assert.equal(reloadedStore.load(), null);
});

test('publication drafts are isolated by stable admin id across A to B to A account switches', async () => {
  const module = await importTranspiledTypeScript('src/utils/system-notice-intent.ts');
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const storeA = module.createSystemNoticeIntentStore(
    storage,
    'admin-a',
    () => 'secure_request_admin_a',
  );
  const intentA = storeA.update('A草稿', 'A内容');

  const storeB = module.createSystemNoticeIntentStore(
    storage,
    'admin-b',
    () => 'secure_request_admin_b',
  );
  assert.equal(storeB.load(), null, 'B must never restore A draft');
  const intentB = storeB.update('B草稿', 'B内容');
  assert.notEqual(intentB.clientRequestId, intentA.clientRequestId);
  storeB.clear();
  assert.equal(storeB.load(), null);
  assert.deepEqual(storeA.load(), intentA, 'B success must not clear A namespace');

  const switchedBackToA = module.createSystemNoticeIntentStore(
    storage,
    'admin-a',
    () => 'unused_secure_request',
  );
  assert.deepEqual(switchedBackToA.load(), intentA, 'switching back in the same tab may restore A draft');

  const invalid = module.createSystemNoticeIntentStore(storage, '', () => 'secure_request_invalid');
  assert.equal(invalid.load(), null);
  assert.throws(() => invalid.update('标题', '内容'), /管理员身份/);
  invalid.clear();
  assert.equal(values.size, 1, 'invalid admin identity must not read, write, or clear persisted drafts');
});

test('only super admins can see the menu and deep-link route', () => {
  const app = source('src/App.vue');
  const router = source('src/router/index.ts');
  assert.match(app, /v-if="isSuperAdmin"[^>]*key="\/system-notices"/);
  assert.match(app, />\s*系统通知\s*</);
  assert.match(router, /path:\s*['"]\/system-notices['"][\s\S]*superAdminOnly:\s*true/);
  assert.match(router, /SystemNoticePublishView/);
  assert.match(router, /adminId/);
  assert.match(router, /if\s*\(\s*!adminId\s*\)\s*return\s*['"]\/login['"]/);
});

test('publish page contains title, content, scope explanation, confirmation and loading guard', () => {
  const view = readView();
  assert.equal(elements(view, 'a-input').length, 1);
  assert.equal(elements(view, 'a-textarea').length, 1);
  assert.match(view.source, /当前所有已启用用户/);
  assert.match(view.source, /二次确认|确认发布/);
  assert.match(view.script, /Modal\.confirm\s*\(/);

  const submit = findFunction(view.script, 'submit');
  assert.ok(submit?.body);
  const statements = submit.body.statements;
  assert.ok(ts.isIfStatement(statements[0]), 'submit must guard repeated clicks first');
  assert.match(statements[0].expression.getText(), /publishing\.value/);
  assert.match(statements[0].thenStatement.getText(), /return/);
  assert.match(view.script, /publishing\.value\s*=\s*true/);
  assert.match(view.script, /publishing\.value\s*=\s*false/);
  assert.match(view.script, /await\s+publishSystemNotice\s*\(/);
  assert.match(view.script, /useAdminFromStorage\s*\(\s*\)/);
  assert.match(
    view.script,
    /createSystemNoticeIntentStore\s*\(\s*sessionStorage\s*,\s*currentAdmin\.value\?\.id/,
  );
  assert.match(view.script, /if\s*\(\s*!currentAdmin\.value\?\.id\s*\)/);
  assert.match(view.script, /clientRequestId:\s*intent\.clientRequestId/);
  assert.match(view.script, /intentStore\.clear\s*\(\s*\)/);

  const publishButtons = elements(view, 'a-button').filter(
    (node) => prop(node, 'on', 'click')?.exp?.content === 'submit',
  );
  assert.equal(publishButtons.length, 1);
  assert.equal(prop(publishButtons[0], 'bind', 'loading')?.exp?.content, 'publishing');
});

test('content textarea does not turn Enter into an accidental broadcast submit', () => {
  const view = readView();
  const textarea = elements(view, 'a-textarea')[0];
  assert.ok(textarea);
  assert.equal(prop(textarea, 'on', 'pressEnter'), undefined);
  assert.equal(prop(textarea, 'on', 'keydown'), undefined);
});
