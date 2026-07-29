const STORAGE_KEY_PREFIX = 'admin_system_notice_publish_intent_v1';
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;
const ADMIN_ID_PATTERN = /^[A-Za-z0-9_-]{1,191}$/;

type IntentStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type SystemNoticeIntent = {
  title: string;
  content: string;
  clientRequestId: string;
};

function secureRequestId(): string {
  return globalThis.crypto.randomUUID();
}

function isIntent(value: unknown): value is SystemNoticeIntent {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SystemNoticeIntent>;
  return (
    typeof candidate.title === 'string' &&
    typeof candidate.content === 'string' &&
    typeof candidate.clientRequestId === 'string' &&
    REQUEST_ID_PATTERN.test(candidate.clientRequestId)
  );
}

export function createSystemNoticeIntentStore(
  storage: IntentStorage,
  adminId: string | null | undefined,
  generateRequestId: () => string = secureRequestId,
) {
  const normalizedAdminId = String(adminId || '').trim();
  const storageKey = ADMIN_ID_PATTERN.test(normalizedAdminId)
    ? `${STORAGE_KEY_PREFIX}:${normalizedAdminId}`
    : null;

  function load(): SystemNoticeIntent | null {
    if (!storageKey) return null;
    try {
      const raw = storage.getItem(storageKey);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      if (isIntent(parsed)) return parsed;
      storage.removeItem(storageKey);
    } catch {
      storage.removeItem(storageKey);
    }
    return null;
  }

  function update(title: string, content: string): SystemNoticeIntent {
    if (!storageKey) throw new Error('管理员身份无效，无法保存或发布系统通知');
    const current = load();
    if (current?.title === title && current.content === content) return current;
    const clientRequestId = generateRequestId();
    if (!REQUEST_ID_PATTERN.test(clientRequestId)) {
      throw new Error('无法生成安全的系统通知请求标识');
    }
    const next = { title, content, clientRequestId };
    storage.setItem(storageKey, JSON.stringify(next));
    return next;
  }

  function clear(): void {
    if (storageKey) storage.removeItem(storageKey);
  }

  return { load, update, clear };
}
