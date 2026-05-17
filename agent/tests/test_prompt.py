"""agents/prompt.py のテスト — テンプレート出力アンカーの検証。"""

from __future__ import annotations

from makelocal_agent.agents.prompt import build_prompt
from makelocal_agent.domain.ingredient import Ingredient
from makelocal_agent.domain.locale import Locale

_MIYAGI = Locale(
    id="miyagi",
    prefecture="宮城県",
    prefectureCode="JP-04",
    region="tohoku",
)


def _ing(id_: str, name: str, story: str | None = None) -> Ingredient:
    kwargs = {
        "id": id_,
        "localeId": "miyagi",
        "name": name,
        "category": "vegetable",
        "seasons": ["winter"],
    }
    if story:
        kwargs["story"] = story
    return Ingredient.model_validate(kwargs)


class TestBuildPrompt:
    def test_contains_locale_prefecture_and_region(self) -> None:
        prompt = build_prompt(locale=_MIYAGI, selected=[_ing("a", "せり")], hints=[])
        assert "宮城県" in prompt
        assert "東北" in prompt

    def test_lists_each_selected_ingredient(self) -> None:
        prompt = build_prompt(
            locale=_MIYAGI,
            selected=[
                _ing("a", "せり", story="春の七草"),
                _ing("b", "牡蠣"),
            ],
            hints=[],
        )
        assert "せり" in prompt
        assert "春の七草" in prompt  # story が括弧で付随
        assert "牡蠣" in prompt

    def test_lists_hints_up_to_5(self) -> None:
        hints = [_ing(f"h{i}", f"hint{i}") for i in range(8)]
        prompt = build_prompt(locale=_MIYAGI, selected=[_ing("s", "せり")], hints=hints)
        # 0〜4 の 5 件が含まれる
        for i in range(5):
            assert f"hint{i}" in prompt
        # 5 以降は含まれない
        for i in range(5, 8):
            assert f"hint{i}" not in prompt

    def test_no_hints_shows_explicit_label(self) -> None:
        prompt = build_prompt(locale=_MIYAGI, selected=[_ing("s", "せり")], hints=[])
        assert "(なし)" in prompt

    def test_contains_output_rules(self) -> None:
        prompt = build_prompt(locale=_MIYAGI, selected=[_ing("a", "せり")], hints=[])
        assert "出力ルール" in prompt
        assert "title:" in prompt
        assert "concept:" in prompt
        assert "keyIngredients" in prompt
        assert "sceneTags" in prompt
        assert "why" in prompt
