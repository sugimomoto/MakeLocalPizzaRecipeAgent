'use client';

/**
 * HomeRedirector — / にアクセスした際の初回判定。
 *
 * - localStorage に locale が保存済みなら /ingredients へ
 * - 未保存なら /local へ
 * - useLocale.isHydrated 完了まで描画なし (SSR 不整合防止)
 */

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useLocale } from '@/hooks/use-locale';

export function HomeRedirector() {
  const { localeId, isHydrated } = useLocale();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;
    router.replace(localeId ? '/ingredients' : '/local');
  }, [isHydrated, localeId, router]);

  return null;
}
