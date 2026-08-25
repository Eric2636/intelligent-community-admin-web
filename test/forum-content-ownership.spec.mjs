import assert from 'node:assert/strict';
import test from 'node:test';
import { canAdminModifyForumContent, isAdminForumAuthor } from '../src/utils/forumContentOwnership.mjs';

test('new and historical virtual forum authors use creator ownership in admin actions', () => {
  for (const authorId of ['__admin_forum__', '__admin_announcement__']) {
    assert.equal(isAdminForumAuthor(authorId), true);
    assert.equal(canAdminModifyForumContent({ role: 'ADMIN', adminId: 'admin-a', boundUserId: '', authorId, createdByAdminId: 'admin-a' }), true);
    assert.equal(canAdminModifyForumContent({ role: 'ADMIN', adminId: 'admin-b', boundUserId: '', authorId, createdByAdminId: 'admin-a' }), false);
    assert.equal(canAdminModifyForumContent({ role: 'SUPERADMIN', adminId: 'root', boundUserId: '', authorId, createdByAdminId: 'admin-a' }), true);
  }
});

test('real mini-program authors continue to follow the current bound user', () => {
  assert.equal(canAdminModifyForumContent({ role: 'ADMIN', adminId: 'admin-a', boundUserId: 'user-b', authorId: 'user-b', createdByAdminId: 'admin-a' }), true);
  assert.equal(canAdminModifyForumContent({ role: 'ADMIN', adminId: 'admin-a', boundUserId: 'user-a', authorId: 'user-b', createdByAdminId: 'admin-a' }), false);
});
