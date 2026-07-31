import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const source = fs.readFileSync(
  path.resolve(import.meta.dirname, '../src/views/ContentView.vue'),
  'utf8',
);

test('task content editor cannot display or submit a workflow status field', () => {
  assert.doesNotMatch(source, /editForm\.taskStatus/);
  assert.doesNotMatch(source, /base\.status\s*=/);
  assert.doesNotMatch(source, /value="PENDING_(?:TAKE|CONFIRM)"/);
});
