"""Recipe (詳細レシピ) ドメイン型 — TypeScript の src/domain/recipe.ts と semantic 同期。

Slice 3 で導入。Slice 2 の Candidate (3 案) に対し、ユーザが選んだ 1 案を
LLM (Gemini Flash 構造化出力) で「材料・手順・ストーリー」まで展開する際の
出力スキーマ。

- RecipeMaterial: 材料 1 行 (name + 量)
- RecipeMeta: 4 軸の俯瞰情報 (人数 / 所要 / 焼成温度 / 難易度)
- RecipeDetailLlmOutput: LLM 1 回の構造化出力全体
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class RecipeMaterial(BaseModel):
    """材料 1 行。name と quantity をペアにする。"""

    name: str = Field(min_length=1)
    quantity: str = Field(min_length=1)


class RecipeMeta(BaseModel):
    """詳細画面上部の俯瞰メタ (人数 / 所要 / 焼成温度 / 難易度)。

    数値ではなく表示用文字列で扱う (例: "4 人分" / "45m" / "270°C" / "★★☆")。
    LLM の自由表現を尊重しつつ最小バリデーション (非空) のみ。
    """

    servings: str = Field(min_length=1)
    duration: str = Field(min_length=1)
    bakingTemp: str = Field(min_length=1)
    difficulty: str = Field(min_length=1)


class RecipeDetailLlmOutput(BaseModel):
    """detail_agent (Gemini Flash) の構造化出力全体。

    - title: 候補 title と semantic 同じだが、LLM がここで再表現する余地を残す
    - materials: 最低 3 品 (UI 上の最小情報量)
    - steps: 最低 3 ステップ (調理工程の体裁)
    - story*: ストーリーカード (eyebrow / headline / body) — シェフが語る一言
    """

    title: str = Field(min_length=1)
    meta: RecipeMeta
    materials: list[RecipeMaterial] = Field(min_length=3)
    steps: list[str] = Field(min_length=3)
    storyEyebrow: str = Field(min_length=1)
    storyHeadline: str = Field(min_length=1)
    storyBody: str = Field(min_length=1)
