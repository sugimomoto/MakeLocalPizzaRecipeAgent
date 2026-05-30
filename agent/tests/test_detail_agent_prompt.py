"""agents/detail_agent.py の prompt 構築テスト。"""

from __future__ import annotations

from makelocal_agent.agents.detail_agent import (
    DETAIL_BASE_INSTRUCTION,
    build_detail_prompt,
)
from makelocal_agent.domain.candidate import Candidate
from makelocal_agent.domain.ingredient import Ingredient
from makelocal_agent.domain.locale import Locale
from makelocal_agent.domain.oven_profile import ENRO_PROFILE, HOME_OVEN_PROFILE

_MIYAGI = Locale(
    id="miyagi",
    prefecture="宮城県",
    prefectureCode="JP-04",
    region="tohoku",
)


def _ing(id_: str, name: str, story: str | None = None) -> Ingredient:
    kwargs: dict[str, object] = {
        "id": id_,
        "localeId": "miyagi",
        "name": name,
        "category": "vegetable",
        "seasons": ["winter"],
    }
    if story:
        kwargs["story"] = story
    return Ingredient.model_validate(kwargs)


def _candidate() -> Candidate:
    return Candidate(
        candidateId="c_1_abcxyz",
        strategy="tune",
        title="春のせり白ピザ",
        concept="ほろ苦さを朝食に",
        keyIngredients=["せり", "モッツァレラ"],
        sceneTags=["朝食"],
        why="一手だけ外して、和の余韻を加える",
    )


class TestDetailBaseInstruction:
    def test_mentions_chef_persona(self) -> None:
        assert "シェフ" in DETAIL_BASE_INSTRUCTION
        assert "和食" in DETAIL_BASE_INSTRUCTION


class TestBuildDetailPrompt:
    def test_contains_locale_prefecture(self) -> None:
        prompt = build_detail_prompt(
            locale=_MIYAGI, selected=[_ing("a", "せり")], candidate=_candidate()
        )
        assert "宮城県" in prompt

    def test_lists_selected_ingredients(self) -> None:
        prompt = build_detail_prompt(
            locale=_MIYAGI,
            selected=[_ing("a", "せり", story="春の七草"), _ing("b", "牡蠣")],
            candidate=_candidate(),
        )
        assert "せり" in prompt
        assert "春の七草" in prompt
        assert "牡蠣" in prompt

    def test_includes_candidate_summary(self) -> None:
        c = _candidate()
        prompt = build_detail_prompt(locale=_MIYAGI, selected=[_ing("a", "せり")], candidate=c)
        assert c.title in prompt
        assert c.concept in prompt
        assert c.why in prompt
        # 戦略の日本語ラベル (tune → "一歩外す")
        assert "一歩外す" in prompt
        # candidate.keyIngredients の各エントリ
        for k in c.keyIngredients:
            assert k in prompt

    def test_includes_output_rules_for_recipe_detail_schema(self) -> None:
        prompt = build_detail_prompt(
            locale=_MIYAGI, selected=[_ing("a", "せり")], candidate=_candidate()
        )
        assert "出力ルール" in prompt
        assert "title:" in prompt
        assert "meta.servings" in prompt
        assert "meta.duration" in prompt
        assert "meta.bakingTemp" in prompt
        assert "meta.difficulty" in prompt
        assert "materials" in prompt
        assert "steps" in prompt
        assert "storyHeadline" in prompt
        assert "storyBody" in prompt


class TestBuildDetailPromptOvenProfile:
    """Slice 8 で追加: 機材プロファイルがプロンプトに反映されること。"""

    def test_default_is_enro_with_high_heat_directive(self) -> None:
        prompt = build_detail_prompt(
            locale=_MIYAGI, selected=[_ing("a", "せり")], candidate=_candidate()
        )
        # ENRO 前提文の鍵フレーズ
        assert "ENRO" in prompt
        assert "400" in prompt and "450" in prompt
        assert "90" in prompt and "120" in prompt
        # 機材前提のセクションヘッダ
        assert "機材前提" in prompt
        # 出力ルール側の bakingTemp 範囲指示
        assert "400〜450°C" in prompt

    def test_home_oven_profile_switches_directive(self) -> None:
        prompt = build_detail_prompt(
            locale=_MIYAGI,
            selected=[_ing("a", "せり")],
            candidate=_candidate(),
            oven_profile=HOME_OVEN_PROFILE,
        )
        # 家庭オーブン側の温度・時間
        assert "250" in prompt and "300" in prompt
        assert "8" in prompt and "15" in prompt
        # 範囲指示の文言
        assert "250〜300°C" in prompt
        # ENRO 固有のフレーズは出ない (短時間高温の数字以外で確実な差を見る)
        assert "ENRO" not in prompt

    def test_enro_profile_explicit_is_same_as_default(self) -> None:
        a = build_detail_prompt(
            locale=_MIYAGI,
            selected=[_ing("a", "せり")],
            candidate=_candidate(),
            oven_profile=ENRO_PROFILE,
        )
        b = build_detail_prompt(
            locale=_MIYAGI, selected=[_ing("a", "せり")], candidate=_candidate()
        )
        assert a == b
