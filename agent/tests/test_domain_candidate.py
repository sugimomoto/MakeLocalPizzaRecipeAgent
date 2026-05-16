"""src/domain/candidate.py のテスト — TS 側 candidate.test.ts と等価。"""

from __future__ import annotations

import re

from makelocal_agent.domain.candidate import (
    STRATEGIES,
    STRATEGY_LABELS,
    Candidate,
    QuickTapSessionPayload,
    Strategy,
    is_strategy,
)


class TestStrategy:
    def test_exposes_exactly_3_strategies_in_canonical_order(self) -> None:
        assert STRATEGIES == ("exploit", "tune", "explore")

    def test_is_strategy_validates_only_3_known_values(self) -> None:
        assert is_strategy("exploit") is True
        assert is_strategy("tune") is True
        assert is_strategy("explore") is True
        assert is_strategy("Exploit") is False
        assert is_strategy("random") is False
        assert is_strategy(None) is False


class TestStrategyLabels:
    def test_has_entry_for_every_strategy_with_consistent_self_reference(self) -> None:
        css_var = re.compile(r"^var\(--mlpr-")
        for s in STRATEGIES:
            label = STRATEGY_LABELS[s]
            assert label.strategy == s
            assert label.japaneseLabel != ""
            assert css_var.match(label.inkColor)
            assert css_var.match(label.bgColor)

    def test_has_expected_japanese_labels(self) -> None:
        assert STRATEGY_LABELS["exploit"].japaneseLabel == "王道"
        assert STRATEGY_LABELS["tune"].japaneseLabel == "一歩外す"
        assert STRATEGY_LABELS["explore"].japaneseLabel == "大冒険"

    def test_uses_strategy_specific_css_variables(self) -> None:
        assert STRATEGY_LABELS["exploit"].inkColor == "var(--mlpr-exploit-ink)"
        assert STRATEGY_LABELS["tune"].bgColor == "var(--mlpr-tune-bg)"
        assert STRATEGY_LABELS["explore"].inkColor == "var(--mlpr-explore-ink)"


class TestQuickTapSessionPayload:
    def test_accepts_fully_populated_3_candidate_session(self) -> None:
        def candidate(cid: str, strategy: Strategy) -> Candidate:
            return Candidate(
                candidateId=cid,
                strategy=strategy,
                title=f"{strategy} title",
                concept="concept line",
                keyIngredients=["牡蠣", "せり"],
                sceneTags=["ワインに合う"],
                why="why explanation",
            )

        payload = QuickTapSessionPayload(
            sessionId="sess_xxx",
            localeId="miyagi",
            ingredients=["miyagi-seri", "miyagi-oyster"],
            candidates=[
                candidate("c1", "exploit"),
                candidate("c2", "tune"),
                candidate("c3", "explore"),
            ],
        )
        assert len(payload.candidates) == 3
        assert [c.strategy for c in payload.candidates] == ["exploit", "tune", "explore"]
