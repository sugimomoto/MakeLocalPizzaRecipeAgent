'use client';

/**
 * /ingredients 画面の Client Component。
 * - useLocale で localeId を取得 (なければ /local へ戻す)
 * - /api/locales/[id]/ingredients を fetch
 * - SeasonTab + CategoryTab でクライアント側フィルタ
 * - useQuickTapStore で選択状態を保持
 * - 「次へ」CTA で sessionId 生成 → /candidates/[id] へ遷移 (state は sessionStorage 経由)
 */

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { CategoryTab } from '@/components/ingredient/CategoryTab';
import { IngredientCard } from '@/components/ingredient/IngredientCard';
import { SeasonTab } from '@/components/ingredient/SeasonTab';
import { Button } from '@/components/primitives/Button';
import { isInSeason } from '@/domain/ingredient';
import { useLocale } from '@/hooks/use-locale';
import { useQuickTapStore } from '@/stores/quicktap';

import { LocaleHeader } from './LocaleHeader';

import type { Ingredient, IngredientCategory, Season } from '@/domain/ingredient';
import type { Locale } from '@/domain/locale';

type IngredientsResponse = {
  localeId: string;
  ingredients: Ingredient[];
};

type LocalesResponse = {
  locales: Locale[];
};

export const PENDING_SESSION_KEY = 'mlpr.pendingSession.v1';

function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `sess_${crypto.randomUUID()}`;
  }
  return `sess_${Math.random().toString(36).slice(2, 14)}`;
}

export function IngredientSelectClient() {
  const router = useRouter();
  const { localeId, isHydrated } = useLocale();
  const { selectedIngredients, toggle } = useQuickTapStore();

  const [ingredients, setIngredients] = useState<Ingredient[] | null>(null);
  const [locales, setLocales] = useState<Locale[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [season, setSeason] = useState<Season | null>(null);
  const [category, setCategory] = useState<IngredientCategory | null>(null);

  // 地元未選択ならば /local へ戻す
  useEffect(() => {
    if (isHydrated && !localeId) {
      router.replace('/local');
    }
  }, [isHydrated, localeId, router]);

  // 都道府県一覧 (LocaleHeader 表示名用)
  useEffect(() => {
    let cancelled = false;
    fetch('/api/locales')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as LocalesResponse;
      })
      .then((data) => {
        if (!cancelled) setLocales(data.locales);
      })
      .catch(() => {
        // header 表示が崩れるだけなので silent
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 食材を fetch
  useEffect(() => {
    if (!localeId) return;
    let cancelled = false;
    fetch(`/api/locales/${encodeURIComponent(localeId)}/ingredients`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as IngredientsResponse;
      })
      .then((data) => {
        if (!cancelled) setIngredients(data.ingredients);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [localeId]);

  const filtered = useMemo(() => {
    if (!ingredients) return [];
    return ingredients.filter((ing) => {
      if (season && !isInSeason(ing, season)) return false;
      if (category && ing.category !== category) return false;
      return true;
    });
  }, [ingredients, season, category]);

  const canProceed = selectedIngredients.length > 0 && !!localeId;

  const handleNext = () => {
    if (!canProceed || !localeId) return;
    const sessionId = generateSessionId();
    const payload = {
      sessionId,
      localeId,
      ingredients: selectedIngredients,
    };
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(PENDING_SESSION_KEY, JSON.stringify(payload));
    }
    router.push(`/candidates/${encodeURIComponent(sessionId)}`);
  };

  if (!isHydrated || !localeId) {
    return <p role="status">読み込み中…</p>;
  }
  if (loadError) {
    return (
      <p role="alert" style={{ color: 'var(--mlpr-shu-deep)' }}>
        食材一覧を取得できませんでした: {loadError}
      </p>
    );
  }
  if (!ingredients) {
    return <p role="status">食材を読み込み中…</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <LocaleHeader localeId={localeId} locales={locales} />
      <SeasonTab value={season} onChange={setSeason} />
      <CategoryTab value={category} onChange={setCategory} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 12,
        }}
      >
        {filtered.map((ing) => (
          <IngredientCard
            key={ing.id}
            ingredient={ing}
            selected={selectedIngredients.includes(ing.id)}
            onToggle={toggle}
          />
        ))}
        {filtered.length === 0 && (
          <p style={{ color: 'var(--mlpr-sumi-muted)' }}>該当する食材がありません</p>
        )}
      </div>

      <div
        style={{
          position: 'sticky',
          bottom: 12,
          display: 'flex',
          justifyContent: 'flex-end',
          paddingTop: 12,
        }}
      >
        <Button variant="shu" size="lg" disabled={!canProceed} onClick={handleNext}>
          {selectedIngredients.length > 0
            ? `次へ (${selectedIngredients.length} 件選択中)`
            : '食材を 1 つ以上選んでください'}
        </Button>
      </div>
    </div>
  );
}
