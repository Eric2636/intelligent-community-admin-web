import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import { NodeTypes, baseParse } from '@vue/compiler-dom';
import { parse } from '@vue/compiler-sfc';

const projectRoot = path.resolve(import.meta.dirname, '..');
const viewsDir = path.join(projectRoot, 'src/views');

function readView(fileName) {
  const filePath = path.join(viewsDir, fileName);
  const source = fs.readFileSync(filePath, 'utf8');
  const { descriptor } = parse(source, { filename: filePath });
  assert.ok(descriptor.template, `${fileName} should contain a template`);
  assert.ok(descriptor.scriptSetup, `${fileName} should contain script setup`);
  return {
    fileName,
    source,
    script: descriptor.scriptSetup.content,
    template: baseParse(descriptor.template.content),
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

function toolbarElements(view, tag) {
  const result = [];
  walk(view.template, (node) => {
    if (
      node.type !== NodeTypes.ELEMENT ||
      node.tag !== 'div' ||
      prop(node, 'attribute', 'class')?.value?.content?.split(/\s+/).includes('toolbar') !== true
    ) {
      return;
    }
    walk(node, (child) => {
      if (child.type === NodeTypes.ELEMENT && child.tag === tag) result.push(child);
    });
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

function eventExpression(node, name) {
  return prop(node, 'on', name)?.exp?.content;
}

function findFunction(script, name) {
  const ast = ts.createSourceFile('view.ts', script, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let found;
  ast.forEachChild((node) => {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node;
  });
  return found;
}

function assertResetsThenLoads(view, handlerName) {
  const fn = findFunction(view.script, handlerName);
  assert.ok(fn?.body, `${view.fileName} should define ${handlerName}()`);
  const statements = fn.body.statements;
  const resetIndex = statements.findIndex(
    (statement) =>
      ts.isExpressionStatement(statement) &&
      ts.isBinaryExpression(statement.expression) &&
      statement.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      statement.expression.left.getText().replace(/\s/g, '') === 'pagination.current' &&
      statement.expression.right.getText().replace(/\s/g, '') === '1',
  );
  const loadIndex = statements.findIndex(
    (statement) =>
      ts.isExpressionStatement(statement) &&
      ts.isCallExpression(statement.expression) &&
      statement.expression.expression.getText() === 'load',
  );
  assert.ok(resetIndex >= 0, `${view.fileName} ${handlerName}() should reset pagination.current to 1`);
  assert.ok(loadIndex > resetIndex, `${view.fileName} ${handlerName}() should load after resetting pagination`);
  const loadCall = statements[loadIndex].expression;
  assert.equal(loadCall.arguments[0]?.kind, ts.SyntaxKind.TrueKeyword, `${view.fileName} search should deduplicate its request`);
}

async function importTranspiledTypeScript(relativePath) {
  const filePath = path.join(projectRoot, relativePath);
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

test('every list search uses one handler that resets to page one before loading', () => {
  const expectedViews = new Set([
    'AdminsView.vue',
    'ContentView.vue',
    'MiniApiErrorLogsView.vue',
    'SystemLogsView.vue',
    'UsersView.vue',
  ]);
  const foundViews = new Set();

  for (const fileName of fs.readdirSync(viewsDir).filter((name) => name.endsWith('.vue'))) {
    const view = readView(fileName);
    const searchInputs = [
      ...elements(view, 'a-input-search'),
      ...elements(view, 'CompactSearchBar'),
    ];
    if (searchInputs.length > 0) foundViews.add(fileName);
    for (const input of searchInputs) {
      assert.equal(eventExpression(input, 'search'), 'submitSearch', `${fileName} search event should use submitSearch`);
      assertResetsThenLoads(view, 'submitSearch');
    }
  }

  assert.deepEqual(foundViews, expectedViews, 'the test inventory should cover every list search view');
});

test('multi-condition list filters wait for an explicit query action', () => {
  for (const fileName of ['ContentView.vue', 'SystemLogsView.vue', 'MiniApiErrorLogsView.vue']) {
    const view = readView(fileName);
    assert.ok(elements(view, 'FilterPanel').length > 0, `${fileName} should use FilterPanel`);
    for (const control of elements(view, 'a-select')) {
      assert.notEqual(
        eventExpression(control, 'change'),
        'submitSearch',
        `${fileName} select should not refresh the list before the user queries`,
      );
    }
    assertResetsThenLoads(view, 'submitSearch');
  }
});

test('remote user binding stops Enter propagation before an old active option can be selected', async () => {
  const view = readView('AdminsView.vue');
  const remoteSelect = elements(view, 'a-select').find((node) => prop(node, 'attribute', 'show-search'));
  assert.ok(remoteSelect, 'AdminsView should contain the searchable user binding select');
  assert.equal(eventExpression(remoteSelect, 'search'), 'captureBindUserKeyword');
  assert.equal(eventExpression(remoteSelect, 'inputKeyDown'), 'submitBindUserSearch');

  const capture = findFunction(view.script, 'captureBindUserKeyword');
  assert.ok(capture?.body, 'AdminsView should define captureBindUserKeyword()');
  assert.doesNotMatch(capture.body.getText(), /fetchBindUsers|listUsers/, 'typing must not issue a remote search');

  const submit = findFunction(view.script, 'submitBindUserSearch');
  assert.ok(submit?.body, 'AdminsView should define submitBindUserSearch()');
  assert.match(submit.body.getText(), /submitOnPlainEnter\s*\(/, 'Enter handling should use the event-consuming helper');
  assert.match(submit.body.getText(), /fetchBindUsers\s*\(/, 'plain Enter should issue the remote search');

  const keyboard = await importTranspiledTypeScript('src/utils/keyboard.ts');
  let searched = 0;
  let selectedOldOption = 0;
  const state = { defaultPrevented: false, propagationStopped: false, immediateStopped: false };
  const event = {
    key: 'Enter',
    preventDefault() {
      state.defaultPrevented = true;
    },
    stopPropagation() {
      state.propagationStopped = true;
    },
    stopImmediatePropagation() {
      state.immediateStopped = true;
    },
  };

  keyboard.submitOnPlainEnter(event, () => {
    searched += 1;
  }, { stopPropagation: true });
  if (!state.immediateStopped) selectedOldOption += 1;

  assert.deepEqual(state, { defaultPrevented: true, propagationStopped: true, immediateStopped: true });
  assert.equal(searched, 1);
  assert.equal(selectedOldOption, 0, 'the stale active option listener must not run after search Enter');
});

test('plain Enter detection ignores IME composition and held-key repeats', async () => {
  const keyboard = await importTranspiledTypeScript('src/utils/keyboard.ts');
  assert.equal(typeof keyboard.isPlainEnter, 'function', 'keyboard utility should export isPlainEnter');
  assert.equal(keyboard.isPlainEnter({ key: 'Enter' }), true);
  assert.equal(keyboard.isPlainEnter({ key: 'Enter', isComposing: true }), false);
  assert.equal(keyboard.isPlainEnter({ key: 'Enter', keyCode: 229 }), false);
  assert.equal(keyboard.isPlainEnter({ key: 'Process', isComposing: false }), false);
  assert.equal(keyboard.isPlainEnter({ key: 'Enter', repeat: true }), false);
  assert.equal(keyboard.isPlainEnter({ key: 'a' }), false);
});

test('status-code Enter runs search only for a plain Enter while not loading', async () => {
  const view = readView('MiniApiErrorLogsView.vue');
  const statusInput = elements(view, 'a-input-number')[0];
  assert.ok(statusInput);
  assert.equal(eventExpression(statusInput, 'pressEnter'), 'submitStatusCodeSearch');
  const submit = findFunction(view.script, 'submitStatusCodeSearch');
  assert.ok(submit?.body);
  assert.match(submit.body.getText(), /submitOnPlainEnter\s*\(/);
  assert.match(submit.body.getText(), /loading\.value/);
  assert.match(submit.body.getText(), /submitSearch/);

  const keyboard = await importTranspiledTypeScript('src/utils/keyboard.ts');
  for (const event of [
    { key: 'Enter', isComposing: true },
    { key: 'Enter', keyCode: 229 },
    { key: 'Enter', repeat: true },
  ]) {
    let calls = 0;
    assert.equal(keyboard.submitOnPlainEnter(event, () => calls += 1), false);
    assert.equal(calls, 0);
  }
  let loadingCalls = 0;
  assert.equal(
    keyboard.submitOnPlainEnter({ key: 'Enter' }, () => loadingCalls += 1, { loading: true }),
    false,
  );
  assert.equal(loadingCalls, 0);
  let plainCalls = 0;
  assert.equal(keyboard.submitOnPlainEnter({ key: 'Enter' }, () => plainCalls += 1), true);
  assert.equal(plainCalls, 1);
});

test('latest request wins across out-of-order success, stale error, and unmount', async () => {
  const { createLatestRequestRunner } = await importTranspiledTypeScript('src/utils/latest-request.ts');
  assert.equal(typeof createLatestRequestRunner, 'function');
  const deferred = () => {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
  const oldRequest = deferred();
  const newRequest = deferred();
  const commits = [];
  const errors = [];
  const loading = [];
  const runner = createLatestRequestRunner();
  const callbacks = {
    onSuccess: (value) => commits.push(value),
    onError: (error) => errors.push(error.message),
    onLoading: (value) => loading.push(value),
  };

  const oldRun = runner.run({ key: 'page=2&status=old', request: () => oldRequest.promise, ...callbacks });
  const newRun = runner.run({ key: 'page=1&status=new', request: () => newRequest.promise, ...callbacks });
  newRequest.resolve('new rows');
  await newRun;
  oldRequest.reject(new Error('stale failure'));
  await oldRun;

  assert.deepEqual(commits, ['new rows']);
  assert.deepEqual(errors, []);
  assert.deepEqual(loading, [true, true, false], 'stale finally must not clear the latest loading state');

  const afterUnmount = deferred();
  const unmountedRun = runner.run({ key: 'after-unmount', request: () => afterUnmount.promise, ...callbacks });
  runner.dispose();
  afterUnmount.resolve('must not commit');
  await unmountedRun;
  assert.deepEqual(commits, ['new rows']);
  assert.deepEqual(errors, []);
  assert.deepEqual(loading, [true, true, false, true], 'settlement after unmount must not mutate loading');
});

test('latest request runner deduplicates searches but allows a forced same-key refresh', async () => {
  const { createLatestRequestRunner } = await importTranspiledTypeScript('src/utils/latest-request.ts');
  const runner = createLatestRequestRunner();
  let requestCalls = 0;
  let resolveRequest;
  const request = () => {
    requestCalls += 1;
    return new Promise((resolve) => {
      resolveRequest = resolve;
    });
  };
  const options = {
    key: 'page=1&keyword=same',
    request,
    onSuccess: () => {},
    onError: () => {},
    onLoading: () => {},
  };

  const first = runner.run({ ...options, deduplicate: true });
  const duplicate = runner.run({ ...options, deduplicate: true });
  assert.equal(first, duplicate);
  assert.equal(requestCalls, 1);

  const forced = runner.run({ ...options, deduplicate: false });
  assert.equal(requestCalls, 2);
  resolveRequest();
  await forced;
  runner.dispose();
  await Promise.race([first, Promise.resolve()]);
});

test('an older page response cannot move pagination or rows back after a new filter', async () => {
  const { createLatestRequestRunner } = await importTranspiledTypeScript('src/utils/latest-request.ts');
  const runner = createLatestRequestRunner();
  const state = { pagination: { current: 2, total: 0 }, rows: [] };
  let resolveOld;
  let resolveNew;
  const oldPromise = new Promise((resolve) => {
    resolveOld = resolve;
  });
  const newPromise = new Promise((resolve) => {
    resolveNew = resolve;
  });
  const runPage = (key, request) => runner.run({
    key,
    request,
    onSuccess: ({ rows, total }) => {
      state.rows = rows;
      state.pagination.total = total;
    },
    onError: () => {},
    onLoading: () => {},
  });

  const oldRun = runPage('page=2&filter=old', () => oldPromise);
  state.pagination.current = 1;
  const newRun = runPage('page=1&filter=new', () => newPromise);
  resolveNew({ rows: ['new'], total: 1 });
  await newRun;
  resolveOld({ rows: ['old'], total: 99 });
  await oldRun;

  assert.deepEqual(state, { pagination: { current: 1, total: 1 }, rows: ['new'] });
});

test('all paginated search views connect load lifecycle to the latest-request runner', () => {
  for (const fileName of [
    'AdminsView.vue',
    'ContentView.vue',
    'MiniApiErrorLogsView.vue',
    'SystemLogsView.vue',
    'UsersView.vue',
  ]) {
    const view = readView(fileName);
    assert.match(view.script, /createLatestRequestRunner\s*\(/, `${fileName} should create a request runner`);
    assert.match(view.script, /listRequest\.run\s*\(/, `${fileName} load should use the request runner`);
    assert.match(view.script, /onUnmounted\s*\(\s*listRequest\.dispose\s*\)/, `${fileName} should dispose on unmount`);
  }
});

test('login Enter submits the form once through the same guarded submit handler', () => {
  const view = readView('LoginView.vue');
  const forms = elements(view, 'a-form');
  assert.equal(forms.length, 1);
  assert.equal(eventExpression(forms[0], 'finish'), 'submit');

  const submitButtons = elements(view, 'a-button').filter(
    (node) => prop(node, 'attribute', 'html-type')?.value?.content === 'submit',
  );
  assert.equal(submitButtons.length, 1, 'login should have one form submit button');

  const submit = findFunction(view.script, 'submit');
  assert.ok(submit?.body, 'LoginView should define submit()');
  const statements = submit.body.statements;
  assert.ok(statements.length >= 2);
  assert.ok(ts.isIfStatement(statements[0]), 'submit should guard duplicate submissions first');
  assert.match(statements[0].expression.getText(), /loading\.value/, 'guard should check loading state');
  assert.match(statements[0].thenStatement.getText(), /return/, 'loading guard should return immediately');
  assert.match(statements[1].getText(), /loading\.value\s*=\s*true/, 'submit should set loading after the guard');
});
