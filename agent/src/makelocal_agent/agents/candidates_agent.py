"""戦略軸 (exploit/tune/explore) ごとの LLM 呼び出しユニット。

設計 (design.md §5):
- 戦略軸ごとに異なる system instruction を持つ
- 同じ output_schema (CandidateLlmOutput) を生成
- ID 付与は orchestrator 側 (run_candidate は title/concept/... のみ生成)
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from ..deps import LlmClient
from ..domain.candidate import Strategy
from ..lib.settings import get_settings

STRATEGY_INSTRUCTION: dict[Strategy, str] = {
    "exploit": (
        "あなたは王道のピザを提案する宮城のシェフ。\n"
        "定番の食材組合せで失敗しない一枚を作ります。\n"
        "落ち着いた語り口・大人向け、和食的な引き算の美学を意識してください。"
    ),
    "tune": (
        "あなたは一歩外したアレンジを得意とする宮城のシェフ。\n"
        "柑橘や酸味、ハーブを一手だけ効かせて軽やかさを加えます。\n"
        "和食的なほろ苦さや余韻にも触れてください。"
    ),
    "explore": (
        "あなたは大冒険を厭わない宮城のシェフ。\n"
        "意外性のある組合せ (甘味・苦味・スパイス) で記憶に残る一枚を提案します。\n"
        "「合うわけがないと思っていた」が「結局これが一番だった」になる仕立てを狙ってください。"
    ),
}


class CandidateLlmOutput(BaseModel):
    """LLM に返させる構造化出力 (Candidate と semantic 同等、ID は後付け)。"""

    title: str = Field(min_length=1, description="ピザ名 (30 字以内)")
    concept: str = Field(min_length=1, description="一行コンセプト (50〜80 字)")
    keyIngredients: list[str] = Field(
        min_length=1, description="主要食材 (選択した食材 + 補完 1〜2 個)"
    )
    sceneTags: list[str] = Field(description="シーンタグ 2〜3 個")
    why: str = Field(min_length=1, description="なぜこの提案かの説明 (50〜100 字)")


async def run_candidate(
    *,
    client: LlmClient,
    strategy: Strategy,
    prompt: str,
    model: str | None = None,
) -> CandidateLlmOutput:
    """指定戦略軸で 1 件の候補を生成する。

    LlmClient プロトコルを経由するので、テストでは MockLlmClient を渡せる。
    """
    effective_model = model or get_settings().gemini_model
    out = await client.run_structured(
        model=effective_model,
        instruction=STRATEGY_INSTRUCTION[strategy],
        prompt=prompt,
        output_schema=CandidateLlmOutput,
    )
    # LlmClient protocol は BaseModel を返すので narrowing
    if not isinstance(out, CandidateLlmOutput):
        msg = f"LlmClient returned unexpected type: {type(out).__name__}"
        raise TypeError(msg)
    return out
