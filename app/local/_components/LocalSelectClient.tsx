'use client';

/**
 * /local の Client Component (Phase 14 リファクタ版)。
 *
 * - 47 都道府県 (src/data/prefectures.ts) を地域別に並べる (fetch なし)
 * - 上部に ScreenHero (「地元 × ピザ」eyebrow + 大型 mincho 見出し)
 * - RegionRail で active region を表示・タップで該当セクションへ jump
 * - スクロールで現在地の region を検出して RegionRail を同期
 * - PrefectureTile で漢字一文字レイアウト + 「原体験」「準備中」「✓」バッジ
 * - 選択時はわずかなディレイを置いて /ingredients へ遷移
 */

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { PrefectureTile } from '@/components/local/PrefectureTile';
import { RegionRail } from '@/components/local/RegionRail';
import { ScreenHero } from '@/components/primitives/ScreenHero';
import { SectionLabel } from '@/components/primitives/SectionLabel';
import {
  groupByRegion,
  PREFECTURE_REGION_LABEL,
  PREFECTURE_REGION_ORDER,
  type PrefectureRegion,
} from '@/data/prefectures';
import { useLocale } from '@/hooks/use-locale';

import styles from './LocalSelectClient.module.css';

const GROUPS = groupByRegion();

export function LocalSelectClient() {
  const router = useRouter();
  const { localeId, setLocale } = useLocale();
  const [picked, setPicked] = useState<string | null>(null);
  const [activeRegion, setActiveRegion] = useState<PrefectureRegion>(PREFECTURE_REGION_ORDER[0]!);
  const sectionRefs = useRef<Partial<Record<PrefectureRegion, HTMLElement | null>>>({});

  function jumpTo(region: PrefectureRegion) {
    const el = sectionRefs.current[region];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // スクロール位置に応じて active region を更新
  useEffect(() => {
    function onScroll() {
      const threshold = 80 + window.scrollY;
      let current = PREFECTURE_REGION_ORDER[0]!;
      for (const r of PREFECTURE_REGION_ORDER) {
        const el = sectionRefs.current[r];
        if (el && el.offsetTop <= threshold) current = r;
      }
      setActiveRegion(current);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function handlePick(id: string) {
    setPicked(id);
    setLocale(id);
    // 視覚的な確認のため少しだけ待ってから遷移
    setTimeout(() => router.push('/ingredients'), 240);
  }

  return (
    <div className={styles.shell}>
      <ScreenHero
        eyebrow="地 元 × ピ ザ"
        title={
          <>
            まずは、
            <br />
            あなたの地元を。
          </>
        }
        sub="タップでそのまま次の食材選びへ。あとから変更できます。"
      />

      <RegionRail active={activeRegion} onJump={jumpTo} />

      <div className={styles.scroll}>
        {GROUPS.map((g) => (
          <section
            key={g.region}
            ref={(el) => {
              sectionRefs.current[g.region] = el;
            }}
            className={styles.regionSection}
            aria-label={PREFECTURE_REGION_LABEL[g.region]}
          >
            <SectionLabel jp={PREFECTURE_REGION_LABEL[g.region]} count={g.items.length} />
            <div className={styles.grid}>
              {g.items.map((p) => (
                <PrefectureTile
                  key={p.id}
                  prefecture={p}
                  selected={picked === p.id}
                  isHome={!picked && localeId === p.id}
                  onSelect={handlePick}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
