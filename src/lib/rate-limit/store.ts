/**
 * RateLimitStore: 同 bucket × key × route のカウンタを atomic に inc する (Slice 9)
 *
 * - `MemoryRateLimitStore`: テスト / ローカル dev / ADC 不可環境用
 * - `FirestoreRateLimitStore`: 本番。Cloud Run の attached SA で Admin SDK 経由
 * - `getRateLimitStore()`: 環境に応じて自動選択 + ADC 失敗時の自動フォールバック
 *
 * 設計詳細: design.md §4
 */

import { getAdminFirestore } from '@/lib/firebase/admin';

import { buildDocId, keyValueOf, secondsUntilNextHour } from './bucket';

import type { RateLimitDecision, TryConsumeInput } from './types';
import type { Firestore, Transaction } from 'firebase-admin/firestore';

export interface RateLimitStore {
  tryConsume(input: TryConsumeInput): Promise<RateLimitDecision>;
}

// ─────────────────────────────────────────────────────────────────────
// Memory implementation (test / local dev / fallback)
// ─────────────────────────────────────────────────────────────────────

export class MemoryRateLimitStore implements RateLimitStore {
  private counts = new Map<string, number>();

  /** テスト用: 内部状態をクリア */
  reset(): void {
    this.counts.clear();
  }

  /** デバッグ用: 現在の生カウンタを覗く (テスト assertion 等で利用) */
  peek(docId: string): number {
    return this.counts.get(docId) ?? 0;
  }

  async tryConsume({
    bucket,
    key,
    routeKey,
    limit,
    now,
  }: TryConsumeInput): Promise<RateLimitDecision> {
    // anonymous は識別できないので「常に通す」(local dev でテストノイズを避ける)
    if (key.kind === 'anonymous') {
      return { allowed: true, remaining: limit };
    }

    const id = buildDocId(bucket, key, routeKey);
    const current = this.counts.get(id) ?? 0;
    if (current >= limit) {
      return { allowed: false, retryAfterSeconds: secondsUntilNextHour(now) };
    }
    this.counts.set(id, current + 1);
    return { allowed: true, remaining: limit - (current + 1) };
  }
}

// ─────────────────────────────────────────────────────────────────────
// Firestore implementation (production)
// ─────────────────────────────────────────────────────────────────────

const COLLECTION = 'rate_limits';

export class FirestoreRateLimitStore implements RateLimitStore {
  constructor(private db: Firestore) {}

  async tryConsume({
    bucket,
    key,
    routeKey,
    limit,
    now,
  }: TryConsumeInput): Promise<RateLimitDecision> {
    if (key.kind === 'anonymous') {
      // 本番では基本到達しないが、念のため常に許可 (anonymous は識別不能)
      return { allowed: true, remaining: limit };
    }

    const docId = buildDocId(bucket, key, routeKey);
    const docRef = this.db.collection(COLLECTION).doc(docId);
    // TTL: bucket + 1h バッファ。Firestore TTL ポリシーで自動削除される。
    const expiresAt = new Date(now.getTime() + 2 * 3600 * 1000);

    return this.db.runTransaction(async (tx: Transaction) => {
      const snap = await tx.get(docRef);
      const data = snap.exists ? snap.data() : undefined;
      const currentCount = typeof data?.count === 'number' ? data.count : 0;

      if (currentCount >= limit) {
        return {
          allowed: false,
          retryAfterSeconds: secondsUntilNextHour(now),
        } satisfies RateLimitDecision;
      }

      if (snap.exists) {
        tx.update(docRef, {
          count: currentCount + 1,
          updatedAt: now,
        });
      } else {
        tx.set(docRef, {
          count: 1,
          limit,
          routeKey,
          bucket,
          keyKind: key.kind,
          keyValue: keyValueOf(key),
          createdAt: now,
          updatedAt: now,
          expiresAt,
        });
      }

      return {
        allowed: true,
        remaining: limit - (currentCount + 1),
      } satisfies RateLimitDecision;
    });
  }
}

// ─────────────────────────────────────────────────────────────────────
// Selector
// ─────────────────────────────────────────────────────────────────────

let _store: RateLimitStore | null = null;
let _memoryFallback: MemoryRateLimitStore | null = null;

/**
 * 環境に応じてストアを選択:
 * - `NODE_ENV=test` または `AGENT_MODE=mock`: Memory (Firestore Admin SDK を呼ばない)
 * - それ以外 (= production / Cloud Run): Firestore Admin
 *   - Admin Firestore の初期化に失敗した場合は Memory にフォールバック
 *     (Cloud Logging に WARNING ログを出して運用通知)
 */
export function getRateLimitStore(): RateLimitStore {
  if (_store) return _store;

  const isMockMode = process.env.AGENT_MODE === 'mock' || process.env.NODE_ENV === 'test';

  if (isMockMode) {
    _store = new MemoryRateLimitStore();
    return _store;
  }

  try {
    _store = new FirestoreRateLimitStore(getAdminFirestore());
    return _store;
  } catch (err) {
    // ADC が無い等の理由で Firestore Admin が取れない場合は Memory に
    // フォールバック。本番では基本起きないが、起きた場合は標準エラーに記録。

    console.warn('[rate-limit] Firestore Admin init failed, falling back to Memory store', err);
    _memoryFallback = _memoryFallback ?? new MemoryRateLimitStore();
    _store = _memoryFallback;
    return _store;
  }
}

/** テスト用: selector の cache をリセット */
export function _resetStoreForTesting(): void {
  _store = null;
  _memoryFallback = null;
}
