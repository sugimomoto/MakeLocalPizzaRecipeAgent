'use client';

/**
 * /ingredients 画面の Client Component (Phase 14 リファクタ版)。
 *
 * 機能差分:
 * - 上部: LocaleHeader (📍県名▾) + 右に「Tap 2 / 2」mincho ラベル
 * - ScreenHero: 「主役にしたい食材を / 1〜3 つ。」+ 「選択中 X/3」
 * - SeasonTab + CategoryTab (既存)
 * - **最大 3 件選択** の cap
 * - 未キュレーション県 (404) は PendingNotice で「準備中」を案内 + /local 戻りリンク
 * - sticky 下バー: 選択中食材 chip pile (タップで解除) + 「AIに3案つくらせる」CTA
 */

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { AvatarButton } from '@/components/auth/AvatarButton';
import { CategoryTab } from '@/components/ingredient/CategoryTab';
import { IngredientCard } from '@/components/ingredient/IngredientCard';
import { SeasonTab } from '@/components/ingredient/SeasonTab';
import { Button } from '@/components/primitives/Button';
import { Chip } from '@/components/primitives/Chip';
import { ScreenHero } from '@/components/primitives/ScreenHero';
import { findPrefecture } from '@/data/prefectures';
import { isInSeason } from '@/domain/ingredient';
import { useLocale } from '@/hooks/use-locale';
import { PENDING_SESSION_KEY } from '@/lib/storage-keys';
import { useQuickTapStore } from '@/stores/quicktap';

import styles from './IngredientSelectClient.module.css';
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

type LoadState = 'idle' | 'loading' | 'ready' | 'pending' | 'error';

const MAX_SELECTION = 3;

function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `sess_${crypto.randomUUID()}`;
  }
  return `sess_${Math.random().toString(36).slice(2, 14)}`;
}

export function IngredientSelectClient() {
  const router = useRouter();
  const { localeId, isHydrated } = useLocale();
  const { selectedIngredients, toggle, clear } = useQuickTapStore();

  const [ingredients, setIngredients] = useState<Ingredient[] | null>(null);
  const [locales, setLocales] = useState<Locale[] | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('idle');
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

  // 食材を fetch (localeId 変更時)
  useEffect(() => {
    if (!localeId) return;
    let cancelled = false;
    // 初期状態を loading に切替 (set-state-in-effect 警告抑止のため microtask 経由)
    Promise.resolve().then(() => {
      if (!cancelled) {
        setLoadState('loading');
        setLoadError(null);
      }
    });
    fetch(`/api/locales/${encodeURIComponent(localeId)}/ingredients`)
      .then(async (res) => {
        if (res.status === 404) {
          if (!cancelled) setLoadState('pending');
          return null;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as IngredientsResponse;
      })
      .then((data) => {
        if (!data) return;
        if (!cancelled) {
          setIngredients(data.ingredients);
          setLoadState('ready');
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : String(err));
          setLoadState('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [localeId]);

  // 地元を変えたら選択をクリア
  useEffect(() => {
    if (localeId) clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localeId]);

  const filtered = useMemo(() => {
    if (!ingredients) return [];
    return ingredients.filter((ing) => {
      if (season && !isInSeason(ing, season)) return false;
      if (category && ing.category !== category) return false;
      return true;
    });
  }, [ingredients, season, category]);

  const selectedSet = new Set(selectedIngredients);
  const atCap = selectedIngredients.length >= MAX_SELECTION;

  const handleToggle = (id: string) => {
    if (!selectedSet.has(id) && atCap) return; // cap 到達時は追加不可
    toggle(id);
  };

  const canProceed = selectedIngredients.length > 0 && !!localeId && loadState === 'ready';

  const handleNext = () => {
    if (!canProceed || !localeId) return;
    const sessionId = generateSessionId();
    const payload = { sessionId, localeId, ingredients: selectedIngredients };
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(PENDING_SESSION_KEY, JSON.stringify(payload));
    }
    router.push(`/candidates/${encodeURIComponent(sessionId)}`);
  };

  // ── render ──
  if (!isHydrated || !localeId) {
    return <p role="status">読み込み中…</p>;
  }

  const prefecture = findPrefecture(localeId);

  return (
    <div className={styles.shell}>
      <div className={styles.topRow}>
        <LocaleHeader localeId={localeId} locales={locales} />
        <div className={styles.topRowRight}>
          <span className={styles.tapBadge}>Tap 2 / 2</span>
          <AvatarButton />
        </div>
      </div>

      <ScreenHero
        title={
          <>
            主役にしたい食材を
            <br />
            1〜{MAX_SELECTION}つ。
          </>
        }
      />
      <p className={styles.selectionCount}>
        選択中 <strong>{selectedIngredients.length}</strong>/{MAX_SELECTION}
      </p>

      {loadState === 'pending' && (
        <div className={styles.pendingNotice} role="status">
          <strong>{prefecture?.prefecture ?? localeId}</strong> はただ今食材データを準備中です。
          <br />
          現在対応している地元は <strong>宮城県 / 長野県 / 高知県</strong> の 3 県のみ。
          <br />
          上部の <span aria-label="ピンアイコン">📍</span> から地元を変更してください。
        </div>
      )}

      {loadState === 'error' && (
        <p role="alert" style={{ color: 'var(--mlpr-shu-deep)', padding: '0 20px' }}>
          食材一覧を取得できませんでした: {loadError}
        </p>
      )}

      {loadState === 'ready' && (
        <>
          <div className={styles.tabsRow}>
            <SeasonTab value={season} onChange={setSeason} />
          </div>
          <div className={styles.catsRow}>
            <CategoryTab value={category} onChange={setCategory} />
          </div>

          <div className={styles.grid}>
            {filtered.map((ing) => (
              <IngredientCard
                key={ing.id}
                ingredient={ing}
                selected={selectedSet.has(ing.id)}
                onToggle={handleToggle}
              />
            ))}
            {filtered.length === 0 && <p className={styles.empty}>該当する食材がありません</p>}
          </div>
        </>
      )}

      <div className={styles.bottomBar}>
        <div className={styles.barInner}>
          {selectedIngredients.length > 0 && (
            <div className={styles.chipPile}>
              {selectedIngredients.map((id) => {
                const ing = ingredients?.find((x) => x.id === id);
                return (
                  <Chip
                    key={id}
                    tone="shu"
                    size="sm"
                    onClick={() => toggle(id)}
                    aria-label={`${ing?.name ?? id} を選択から外す`}
                  >
                    {ing?.name ?? id} <span style={{ opacity: 0.5, marginLeft: 3 }}>×</span>
                  </Chip>
                );
              })}
            </div>
          )}
          <Button
            variant="shu"
            size="lg"
            disabled={!canProceed}
            onClick={handleNext}
            style={{ width: '100%' }}
          >
            {selectedIngredients.length > 0
              ? 'AIに 3 案つくらせる ✦'
              : '食材を 1 つ以上選んでください'}
          </Button>
        </div>
      </div>
    </div>
  );
}
