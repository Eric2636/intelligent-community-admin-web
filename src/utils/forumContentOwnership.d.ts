export type ForumContentOwnershipInput = {
  role?: 'ADMIN' | 'SUPERADMIN';
  adminId?: string;
  boundUserId?: string | null;
  authorId?: string | null;
  createdByAdminId?: string | null;
};

export declare function isAdminForumAuthor(authorId?: string | null): boolean;
export declare function canAdminModifyForumContent(input: ForumContentOwnershipInput): boolean;
