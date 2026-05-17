/**
 * CandidateCard — 候補 1 案を表示する大型カード。
 *
 * 段階的に埋まる PartialCandidate を受け取り、未確定フィールドはスケルトン表示。
 * - title / concept / keyIngredients / sceneTags / why をフィールドごとに描画
 * - 戦略印 (StrategySeal) を右上に配置
 * - isDone で完了マーカー (緑のドット)
 * - asButton + onClick で interactive (詳細画面遷移用)
 */

import { Card } from '@/components/primitives/Card';
import { Chip } from '@/components/primitives/Chip';

import styles from './CandidateCard.module.css';
import { StrategySeal } from './StrategySeal';

import type { PartialCandidate } from '@/hooks/use-quicktap-stream';

export type CandidateCardProps = {
  candidate: PartialCandidate;
  onSelect?: () => void;
  /** 候補一覧でスクロール位置が中央に来ている (= 決定ボタンが選ぶ対象) であることを示す。 */
  isActive?: boolean;
};

export function CandidateCard({ candidate, onSelect, isActive = false }: CandidateCardProps) {
  const { title, concept, keyIngredients, sceneTags, why, isDone } = candidate;
  const cardClass = [styles.card, isActive ? styles.cardActive : null].filter(Boolean).join(' ');

  const inner = (
    <>
      {isDone && <span className={styles.doneIndicator} aria-label="決定可能" />}

      <div className={styles.header}>
        {title ? (
          <h3 className={styles.title}>{title}</h3>
        ) : (
          <div className={styles.titleSkeleton} role="status" aria-label="タイトル生成中" />
        )}
        <StrategySeal strategy={candidate.strategy} size={56} />
      </div>

      {concept ? (
        <p className={styles.concept}>{concept}</p>
      ) : (
        <div className={styles.conceptSkeleton} role="status" aria-label="コンセプト生成中" />
      )}

      {keyIngredients && keyIngredients.length > 0 && (
        <div className={styles.chipRow} aria-label="主な食材">
          {keyIngredients.map((ing) => (
            <Chip key={ing} tone="shu" size="sm">
              {ing}
            </Chip>
          ))}
        </div>
      )}

      {sceneTags && sceneTags.length > 0 && (
        <div className={styles.chipRow} aria-label="シーンタグ">
          {sceneTags.map((tag) => (
            <Chip key={tag} tone="ghost" size="sm">
              {tag}
            </Chip>
          ))}
        </div>
      )}

      {why && <p className={styles.why}>{why}</p>}
    </>
  );

  const badge = isActive ? (
    <span className={styles.activeBadge} aria-hidden="true">
      選択中
    </span>
  ) : null;

  if (onSelect) {
    return (
      <div className={styles.wrap}>
        {badge}
        <Card asButton onClick={onSelect} elevated padding="lg" className={cardClass}>
          {inner}
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      {badge}
      <Card elevated padding="lg" className={cardClass}>
        {inner}
      </Card>
    </div>
  );
}
