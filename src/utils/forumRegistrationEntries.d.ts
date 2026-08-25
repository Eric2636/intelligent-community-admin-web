export type RegistrationEntriesPatch<T> = { loading?: boolean; error?: string; entries?: T[] };
export function createRegistrationEntriesLoader<T>(
  fetchEntries: (postId: string) => Promise<{ list?: T[] }>,
  update: (patch: RegistrationEntriesPatch<T>) => void,
): { load(postId: string): Promise<void>; retry(): Promise<void>; dispose(): void };
