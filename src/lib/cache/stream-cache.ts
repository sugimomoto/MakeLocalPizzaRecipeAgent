/**
 * sessionStorage ベースのストリーム結果キャッシュ (Slice 7)。
 *
 * リロード時の再生成 (Vertex AI / Imagen 呼び出し) を回避するため、候補一覧と
 * 詳細レシピの最終結果を sessionStorage に書く。タブを閉じたら自然に消える
 * = ユーザが新しいセッションを意図したときは再生成される。
 *
 * 読み書き失敗 (容量制限・privacy mode 等) はサイレントスキップ。本機能は
 * 純粋に体感の最適化なので、失敗してもアプリは普通に動く (再生成にフォールバック)。
 */

import { CANDIDATES_CACHE_PREFIX, RECIPE_CACHE_PREFIX } from '../storage-keys';

import type { PartialCandidate } from '@/domain/candidate';
import type { RecipeDetailSnapshot } from '@/domain/recipe';

type CandidatesCachePayload = {
  /** isDone === true の 3 案 (途中の不完全な candidate はキャッシュしない) */
  candidates: PartialCandidate[];
};

function candidatesKey(sessionId: string): string {
  return `${CANDIDATES_CACHE_PREFIX}${sessionId}`;
}

function recipeKey(candidateId: string): string {
  return `${RECIPE_CACHE_PREFIX}${candidateId}`;
}

function safeGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // 容量制限などは黙ってスキップ (キャッシュは optional)
  }
}

function safeRemove(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // noop
  }
}

export function readCandidatesCache(sessionId: string): PartialCandidate[] | null {
  const raw = safeGet(candidatesKey(sessionId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CandidatesCachePayload>;
    if (!parsed || !Array.isArray(parsed.candidates)) return null;
    // 軽い shape チェック (3 案揃って isDone であることを期待)。
    // ここで弾かれた古いキャッシュは null 返しで再生成にフォールバック。
    const all = parsed.candidates.every(
      (c): c is PartialCandidate =>
        c != null &&
        typeof c.candidateId === 'string' &&
        typeof c.strategy === 'string' &&
        c.isDone === true,
    );
    if (!all || parsed.candidates.length === 0) return null;
    return parsed.candidates;
  } catch {
    return null;
  }
}

export function writeCandidatesCache(sessionId: string, candidates: PartialCandidate[]): void {
  // 全 candidate が isDone のときだけキャッシュ。途中状態をキャッシュしても役立たない。
  if (!candidates.every((c) => c.isDone)) return;
  if (candidates.length === 0) return;
  const payload: CandidatesCachePayload = { candidates };
  safeSet(candidatesKey(sessionId), JSON.stringify(payload));
}

export function clearCandidatesCache(sessionId: string): void {
  safeRemove(candidatesKey(sessionId));
}

export function readRecipeDetailCache(candidateId: string): RecipeDetailSnapshot | null {
  const raw = safeGet(recipeKey(candidateId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<RecipeDetailSnapshot>;
    if (
      !parsed ||
      typeof parsed.recipeId !== 'string' ||
      typeof parsed.title !== 'string' ||
      typeof parsed.imageUrl !== 'string' ||
      !parsed.meta ||
      !Array.isArray(parsed.materials) ||
      !Array.isArray(parsed.steps) ||
      !parsed.story
    ) {
      return null;
    }
    return parsed as RecipeDetailSnapshot;
  } catch {
    return null;
  }
}

export function writeRecipeDetailCache(candidateId: string, snapshot: RecipeDetailSnapshot): void {
  safeSet(recipeKey(candidateId), JSON.stringify(snapshot));
}

export function clearRecipeDetailCache(candidateId: string): void {
  safeRemove(recipeKey(candidateId));
}
