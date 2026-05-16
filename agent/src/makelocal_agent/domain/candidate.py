"""Candidate ドメイン型 — TypeScript の src/domain/candidate.ts と semantic 同期。

- Strategy: exploit (王道) / tune (一歩外す) / explore (大冒険)
- STRATEGY_LABELS で日本語ラベル + CSS 変数値を一元管理 (TS と完全同期)
- QuickTapSessionPayload: 1 セッションの最終確定形 (3 候補)
"""

from __future__ import annotations

from typing import Literal, get_args

from pydantic import BaseModel, Field

from .ingredient import IngredientId
from .locale import LocaleId

Strategy = Literal["exploit", "tune", "explore"]

STRATEGIES: tuple[Strategy, ...] = get_args(Strategy)


class StrategyLabel(BaseModel):
    """戦略軸の表示メタ。CSS 変数文字列は TS 側と完全一致させる。"""

    strategy: Strategy
    japaneseLabel: str
    inkColor: str
    bgColor: str


STRATEGY_LABELS: dict[Strategy, StrategyLabel] = {
    "exploit": StrategyLabel(
        strategy="exploit",
        japaneseLabel="王道",
        inkColor="var(--mlpr-exploit-ink)",
        bgColor="var(--mlpr-exploit-bg)",
    ),
    "tune": StrategyLabel(
        strategy="tune",
        japaneseLabel="一歩外す",
        inkColor="var(--mlpr-tune-ink)",
        bgColor="var(--mlpr-tune-bg)",
    ),
    "explore": StrategyLabel(
        strategy="explore",
        japaneseLabel="大冒険",
        inkColor="var(--mlpr-explore-ink)",
        bgColor="var(--mlpr-explore-bg)",
    ),
}


class Candidate(BaseModel):
    """1 セッションで生成される 3 候補のうちの 1 つ。"""

    candidateId: str = Field(min_length=1)
    strategy: Strategy
    title: str = Field(min_length=1)
    concept: str = Field(min_length=1)
    keyIngredients: list[str] = Field(min_length=1)
    sceneTags: list[str]
    why: str = Field(min_length=1)


class QuickTapSessionPayload(BaseModel):
    """1 セッションの最終確定形 (NDJSON 完了時に確定する全体)。"""

    sessionId: str = Field(min_length=1)
    localeId: LocaleId = Field(min_length=1)
    ingredients: list[IngredientId]
    candidates: list[Candidate]


def is_strategy(value: object) -> bool:
    """値が Strategy リテラルのいずれかかを判定する。"""
    return isinstance(value, str) and value in STRATEGIES
