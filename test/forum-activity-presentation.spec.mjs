import assert from 'node:assert/strict';
import test from 'node:test';
import { forumActivityPresentation } from '../src/utils/forumActivityPresentation.mjs';

const now = new Date('2026-08-24T12:00:00Z');

test('activity presentation maps content and extensible unknown feature types', () => {
  assert.deepEqual(forumActivityPresentation({ featureType: 'CONTENT' }, now), { label: '内容', registration: null });
  assert.deepEqual(forumActivityPresentation({ featureType: 'POLL' }, now), { label: 'POLL', registration: null });
});

test('registration presentation exposes count, deadline and all three statuses', () => {
  const base = { featureType: 'REGISTRATION', registration: { registeredCount: 2, capacity: 5, deadlineAt: '2026-08-25T12:00:00Z' } };
  assert.equal(forumActivityPresentation(base, now).registration.status, '报名中');
  assert.equal(forumActivityPresentation({ ...base, registration: { ...base.registration, registeredCount: 5 } }, now).registration.status, '已满');
  assert.equal(forumActivityPresentation({ ...base, registration: { ...base.registration, deadlineAt: '2026-08-24T12:00:00Z' } }, now).registration.status, '已截止');
});
