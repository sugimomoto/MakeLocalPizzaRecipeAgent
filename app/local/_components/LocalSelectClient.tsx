'use client';

/**
 * /local 画面の Client Component。
 * /api/locales を fetch → PrefectureGrid で表示 → 選択 → useLocale.setLocale → /ingredients へ。
 */

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { PrefectureGrid } from '@/components/local/PrefectureGrid';
import { useLocale } from '@/hooks/use-locale';

import type { Locale, Region } from '@/domain/locale';

type LocalesResponse = { locales: Locale[] };

export function LocalSelectClient() {
  const router = useRouter();
  const { localeId, setLocale } = useLocale();
  const [locales, setLocales] = useState<Locale[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [regionFilter, setRegionFilter] = useState<Region | null>(null);

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
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelect = (id: string) => {
    setLocale(id);
    router.push('/ingredients');
  };

  if (loadError) {
    return (
      <p role="alert" style={{ color: 'var(--mlpr-shu-deep)' }}>
        都道府県一覧を取得できませんでした: {loadError}
      </p>
    );
  }

  if (!locales) {
    return <p role="status">読み込み中…</p>;
  }

  return (
    <PrefectureGrid
      locales={locales}
      selectedLocaleId={localeId}
      onSelectLocale={handleSelect}
      regionFilter={regionFilter}
      onChangeRegionFilter={setRegionFilter}
    />
  );
}
