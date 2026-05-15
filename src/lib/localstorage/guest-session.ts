/**
 * 匿名 (ゲスト) セッション ID の払い出しと永続化。
 *
 * - 初回は UUID v4 を生成して localStorage に保存
 * - 2 回目以降は同じ ID を返す (永続化される anon ID)
 * - キー: mlpr.guestSessionId.v1
 * - 値: "guest_" + UUID v4
 * - SSR セーフ: window が無い環境では crypto.randomUUID() でその場生成 (非永続)
 *
 * ログ・分析・FB の主体識別に使う。Slice 4 で Firebase Auth が入ったら、
 * ゲスト → ログイン昇格時にこの ID を Firestore へマージするためのキーに使える。
 */

export const GUEST_SESSION_STORAGE_KEY = 'mlpr.guestSessionId.v1';
export const GUEST_SESSION_PREFIX = 'guest_';

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function generateUuidV4(): string {
  // crypto.randomUUID は Node 19+ / 全ての主要ブラウザで利用可能
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // フォールバック (テスト環境やレガシー想定。RFC 4122 準拠)
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40; // version 4
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80; // variant 10
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function buildGuestSessionId(): string {
  return `${GUEST_SESSION_PREFIX}${generateUuidV4()}`;
}

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isValidGuestSessionId(value: string | null): value is string {
  if (value === null) return false;
  if (!value.startsWith(GUEST_SESSION_PREFIX)) return false;
  const uuid = value.slice(GUEST_SESSION_PREFIX.length);
  return UUID_V4_REGEX.test(uuid);
}

/**
 * 既存のゲストセッション ID を返す。無ければ新規発行して保存。
 * SSR/localStorage 不可な環境では永続化なしで毎回新しい ID を返す。
 */
export function getOrCreateGuestSessionId(): string {
  const storage = getStorage();
  if (!storage) {
    return buildGuestSessionId();
  }

  const existing = storage.getItem(GUEST_SESSION_STORAGE_KEY);
  if (isValidGuestSessionId(existing)) {
    return existing;
  }

  const fresh = buildGuestSessionId();
  storage.setItem(GUEST_SESSION_STORAGE_KEY, fresh);
  return fresh;
}

/** 永続化されているゲストセッション ID を返す。無ければ null。発行はしない。 */
export function readGuestSessionId(): string | null {
  const storage = getStorage();
  if (!storage) return null;
  const value = storage.getItem(GUEST_SESSION_STORAGE_KEY);
  return isValidGuestSessionId(value) ? value : null;
}

export function clearGuestSessionId(): void {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(GUEST_SESSION_STORAGE_KEY);
}
