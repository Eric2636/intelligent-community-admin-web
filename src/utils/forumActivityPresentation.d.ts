export function forumActivityPresentation(record: any, now?: Date): {
  label: string;
  registration: null | { registeredCount: number; capacity: number; deadlineAt: string; status: string };
};
