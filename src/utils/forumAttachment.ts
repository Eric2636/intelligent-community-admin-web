export const MAX_FORUM_ATTACHMENT_BYTES = 20 * 1024 * 1024;
export const MAX_FORUM_ATTACHMENTS = 5;
const ALLOWED = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt']);

export function validateForumAttachmentFile(file: File) {
  if (file.size <= 0) throw new Error('附件不能为空');
  if (file.size > MAX_FORUM_ATTACHMENT_BYTES) throw new Error('单个附件不能超过20MB');
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED.has(ext)) throw new Error('仅支持 PDF、Office 文档或 TXT');
}

export async function sha256File(file: File) {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
