const ADMIN_FORUM_AUTHOR_IDS = new Set(['__admin_forum__', '__admin_announcement__']);

export function isAdminForumAuthor(authorId) {
  return ADMIN_FORUM_AUTHOR_IDS.has(String(authorId || ''));
}

export function canAdminModifyForumContent(input) {
  if (input.role === 'SUPERADMIN') return true;
  if (isAdminForumAuthor(input.authorId)) {
    return Boolean(input.createdByAdminId) && input.createdByAdminId === input.adminId;
  }
  const boundUserId = String(input.boundUserId || '').trim();
  return Boolean(boundUserId) && String(input.authorId || '') === boundUserId;
}
