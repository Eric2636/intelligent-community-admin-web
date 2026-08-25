import assert from 'node:assert/strict';
import test from 'node:test';
import { createRegistrationEntriesLoader } from '../src/utils/forumRegistrationEntries.mjs';

const deferred = () => { let resolve; let reject; const promise = new Promise((r, j) => { resolve = r; reject = j; }); return { promise, resolve, reject }; };

test('new registration entry requests clear old rows and older responses cannot overwrite the latest', async () => {
  const a = deferred(); const b = deferred();
  const state = { loading: false, error: '', entries: [{ userId: 'old' }] };
  const loader = createRegistrationEntriesLoader((id) => id === 'a' ? a.promise : b.promise, (patch) => Object.assign(state, patch));
  const pa = loader.load('a');
  assert.deepEqual(state, { loading: true, error: '', entries: [] });
  const pb = loader.load('b');
  b.resolve({ list: [{ userId: 'new' }] }); await pb;
  a.resolve({ list: [{ userId: 'stale' }] }); await pa;
  assert.deepEqual(state, { loading: false, error: '', entries: [{ userId: 'new' }] });
});

test('failed registration entry requests clear rows and retry the current post with loading state', async () => {
  let attempts = 0;
  const states = [];
  const loader = createRegistrationEntriesLoader(async () => { attempts += 1; if (attempts === 1) throw new Error('boom'); return { list: [] }; }, (patch) => states.push(patch));
  await loader.load('post-1');
  assert.deepEqual(states.at(-1), { loading: false });
  assert.ok(states.some((state) => state.error === 'boom' && state.entries?.length === 0));
  await loader.retry();
  assert.equal(attempts, 2);
  assert.ok(states.some((state) => state.loading === true));
  assert.deepEqual(states.at(-2), { entries: [], error: '' });
});
