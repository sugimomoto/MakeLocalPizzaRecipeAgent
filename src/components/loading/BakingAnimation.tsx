/**
 * BakingAnimation — 候補生成中の情緒的演出。ピザが焼ける感じを CSS keyframes で。
 *
 * - PizzaDisk を中央に置き、外側に熱の輻射 (radial-gradient) を重ねて呼吸させる
 * - prefers-reduced-motion: reduce 環境ではアニメーションを止める (アクセシビリティ)
 */

import { PizzaDisk } from '@/components/illustration/PizzaDisk';

import styles from './BakingAnimation.module.css';

export type BakingAnimationProps = {
  /** 候補生成中に表示するメッセージ。デフォルトは「焼成中」 */
  label?: string;
  /** PizzaDisk の seed (見た目バリエーション)。デフォルト 11。 */
  seed?: number;
};

const DEFAULT_TOPPINGS = [
  { color: '#3F5028', count: 8, size: 9, type: 'leaf' as const },
  { color: '#7A6952', count: 4, size: 12 },
  { color: '#F0E4B8', count: 6, size: 10 },
];

export function BakingAnimation({ label = '焼成中', seed = 11 }: BakingAnimationProps) {
  return (
    <div className={styles.container} role="status" aria-live="polite" aria-label={label}>
      <div className={styles.oven}>
        <span className={styles.heat} aria-hidden="true" />
        <div className={styles.disk}>
          <PizzaDisk size={200} seed={seed} toppings={DEFAULT_TOPPINGS} label={`${label}のピザ`} />
        </div>
      </div>
      <p className={styles.label}>
        {label}
        <span className={styles.dots} aria-hidden="true" />
      </p>
    </div>
  );
}
