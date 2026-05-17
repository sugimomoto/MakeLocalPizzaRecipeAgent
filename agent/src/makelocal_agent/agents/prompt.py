"""LLM 入力プロンプト構築。

design.md §5.2 のテンプレートに沿って:
  - 地元 (prefecture + region)
  - 選択食材 (name + story)
  - 同地元のヒント食材 (補完候補)
  - 出力ルール (字数・トーン)

戦略軸固有の instruction は candidates_agent.py の STRATEGY_INSTRUCTION 側に集約。
"""

from __future__ import annotations

from ..domain.ingredient import Ingredient
from ..domain.locale import Locale

_REGION_LABEL: dict[str, str] = {
    "hokkaido": "北海道",
    "tohoku": "東北",
    "kanto": "関東",
    "chubu": "中部",
    "kinki": "近畿",
    "chugoku": "中国",
    "shikoku": "四国",
    "kyushu-okinawa": "九州・沖縄",
}


def build_prompt(
    *,
    locale: Locale,
    selected: list[Ingredient],
    hints: list[Ingredient],
) -> str:
    """LLM へ渡す user prompt 文字列を組み立てる。

    selected: ユーザが Tap2 で選んだ食材 (1〜3 件想定)
    hints:    同地元・同季節の他の旬食材 (5 件以内、補完候補として LLM に提示)
    """
    region_jp = _REGION_LABEL.get(locale.region, locale.region)

    selected_lines = "\n".join(
        f"- {ing.name}" + (f" ({ing.story})" if ing.story else "") for ing in selected
    )
    hint_lines = "\n".join(f"- {ing.name}" for ing in hints[:5]) if hints else "(なし)"

    return (
        f"地元: {locale.prefecture} ({region_jp})\n"
        f"\n"
        f"選択された食材:\n{selected_lines}\n"
        f"\n"
        f"参考 (同地元の他の旬食材):\n{hint_lines}\n"
        f"\n"
        f"【出力ルール】\n"
        f"- title: 30 字以内、ピザ名 (例「松島牡蠣とせりの白ピザ」)\n"
        f"- concept: 50〜80 字、コンセプト 1 行\n"
        f"- keyIngredients: 選択食材 + 補完 1〜2 個 (チーズ等を含む配列、3〜5 件)\n"
        f"- sceneTags: 2〜3 個 (例「ワインに合う」「週末家族」)\n"
        f"- why: 50〜100 字、なぜこの提案かを 1 段落\n"
        f"- 日本語で出力。記号は最小限。"
    )
