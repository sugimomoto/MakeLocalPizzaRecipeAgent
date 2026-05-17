"""詳細レシピ生成エージェント (Slice 3)。

Slice 2 の候補 (3 案のうち 1 つ) を入力に、Gemini Flash の構造化出力で
材料・手順・ストーリーを 1 回で展開する。

- 戦略軸ごとの instruction は使わず、シェフとしての地に足のついた語り口を 1 本に統一
- output_schema は RecipeDetailLlmOutput
- ID 付与・並列化は recipe_orchestrator 側に分離
"""

from __future__ import annotations

from ..deps import LlmClient
from ..domain.candidate import STRATEGY_LABELS, Candidate
from ..domain.ingredient import Ingredient
from ..domain.locale import Locale
from ..domain.recipe import RecipeDetailLlmOutput
from ..lib.settings import get_settings

DETAIL_BASE_INSTRUCTION = (
    "あなたは仙台のシェフ。和食の引き算の美学を持ちながら、\n"
    "ピザという西洋料理を地元食材で組み立てる名手です。\n"
    "材料分量・手順・ストーリーを丁寧に組み立ててください。\n"
    "落ち着いた語り口・大人向け。記号は最小限。"
)


def build_detail_prompt(
    *,
    locale: Locale,
    selected: list[Ingredient],
    candidate: Candidate,
) -> str:
    """detail_agent に渡す user prompt を組み立てる。

    候補のメタ (title / concept / strategy / why) を再提示して、
    LLM が「同じ候補の延長線上の詳細レシピ」を出すよう誘導する。
    """
    strategy_label = STRATEGY_LABELS[candidate.strategy].japaneseLabel
    selected_lines = "\n".join(
        f"- {ing.name}" + (f" ({ing.story})" if ing.story else "") for ing in selected
    )
    key_ing_lines = "\n".join(f"- {name}" for name in candidate.keyIngredients)

    return (
        f"地元: {locale.prefecture}\n"
        f"\n"
        f"選択された食材:\n{selected_lines}\n"
        f"\n"
        f"候補 (Slice 2 のサマリ):\n"
        f"- title: {candidate.title}\n"
        f"- concept: {candidate.concept}\n"
        f"- 戦略: {strategy_label}\n"
        f"- 主要食材:\n{key_ing_lines}\n"
        f"- why: {candidate.why}\n"
        f"\n"
        f"【出力ルール】\n"
        f"- title: 候補の意図を引き継ぐ (再表現は可)\n"
        f"- meta.servings: '4 人分' のような表記\n"
        f"- meta.duration: 'Xm' (例 '45m')\n"
        f"- meta.bakingTemp: 'X°C' (例 '270°C')\n"
        f"- meta.difficulty: '★★☆' のような 3 段階表記\n"
        f"- materials: 5〜8 品目、name と quantity (g / 個 / 適量 等) を明示\n"
        f"- steps: 4〜6 ステップ、各 1 文で完結\n"
        f"- storyEyebrow: 'ゲストに語る' '今夜のひと皿' のような短い見出し\n"
        f"- storyHeadline: 鍵カッコ付き 1 行のキャッチ (10〜25 字)\n"
        f"- storyBody: 50〜100 字の解説\n"
        f"- 日本語で出力。"
    )


async def run_recipe_detail(
    *,
    client: LlmClient,
    locale: Locale,
    selected: list[Ingredient],
    candidate: Candidate,
    model: str | None = None,
) -> RecipeDetailLlmOutput:
    """Gemini Flash で詳細レシピ 1 件を構造化出力で生成する。"""
    effective_model = model or get_settings().gemini_model
    prompt = build_detail_prompt(locale=locale, selected=selected, candidate=candidate)
    out = await client.run_structured(
        model=effective_model,
        instruction=DETAIL_BASE_INSTRUCTION,
        prompt=prompt,
        output_schema=RecipeDetailLlmOutput,
    )
    if not isinstance(out, RecipeDetailLlmOutput):
        msg = f"LlmClient returned unexpected type: {type(out).__name__}"
        raise TypeError(msg)
    return out
