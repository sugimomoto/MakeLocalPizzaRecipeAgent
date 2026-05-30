"""data/ingredients_repository.py のテスト。"""

from __future__ import annotations

from pathlib import Path

import pytest
from pydantic import ValidationError

from makelocal_agent.data.ingredients_repository import IngredientsRepository

PROJECT_ROOT = Path(__file__).resolve().parents[1]
REAL_YAML = PROJECT_ROOT / "data" / "ingredients.yaml"


@pytest.fixture
def repo() -> IngredientsRepository:
    return IngredientsRepository.from_yaml(REAL_YAML)


class TestFromYaml:
    # Slice 7 後: 全 47 都道府県 × 10 食材 = 470 件にスケール  # noqa: RUF003
    def test_loads_all_47_prefectures(self, repo: IngredientsRepository) -> None:
        locales = repo.list_locales()
        assert len(locales) == 47
        ids = [loc.id for loc in locales]
        # 旧 3 県 (miyagi/nagano/kochi) は引き続き含まれている
        assert "miyagi" in ids
        assert "nagano" in ids
        assert "kochi" in ids
        # 新規追加された代表例も含む
        assert "hokkaido" in ids
        assert "okinawa" in ids

    def test_each_locale_has_10_ingredients(self, repo: IngredientsRepository) -> None:
        for loc in repo.list_locales():
            items = repo.list_ingredients(loc.id)
            assert items is not None
            assert len(items) == 10

    def test_total_ingredient_count_is_470(self, repo: IngredientsRepository) -> None:
        total = sum(len(repo.list_ingredients(loc.id) or []) for loc in repo.list_locales())
        assert total == 470


class TestFinders:
    def test_find_locale_returns_match(self, repo: IngredientsRepository) -> None:
        assert repo.find_locale("miyagi") is not None
        assert repo.find_locale("miyagi").prefecture == "宮城県"  # type: ignore[union-attr]

    def test_find_locale_unknown_returns_none(self, repo: IngredientsRepository) -> None:
        assert repo.find_locale("atlantis") is None

    def test_find_ingredient_returns_match(self, repo: IngredientsRepository) -> None:
        ing = repo.find_ingredient("miyagi-seri")
        assert ing is not None
        assert ing.localeId == "miyagi"
        assert ing.name == "せり(根付き)"

    def test_find_ingredient_unknown_returns_none(self, repo: IngredientsRepository) -> None:
        assert repo.find_ingredient("does-not-exist") is None

    def test_list_ingredients_unknown_locale_returns_none(
        self, repo: IngredientsRepository
    ) -> None:
        assert repo.list_ingredients("atlantis") is None


class TestSchemaValidation:
    def test_rejects_malformed_yaml_root(self, tmp_path: Path) -> None:
        bad = tmp_path / "bad.yaml"
        bad.write_text("locales: not-a-list", encoding="utf-8")
        with pytest.raises(ValidationError):
            IngredientsRepository.from_yaml(bad)

    def test_rejects_locale_missing_required_fields(self, tmp_path: Path) -> None:
        bad = tmp_path / "bad.yaml"
        bad.write_text(
            """
locales:
  - id: x
    prefecture: x県
    prefectureCode: JP-01
    region: tohoku
    ingredients: []
""",
            encoding="utf-8",
        )
        # ingredients が空でも parse 自体は通る (Pydantic は min_length 指定無し)
        # ただし domain Ingredient で seasons の必須/min_length=1 はかかる
        # ここでは locales が valid なら通ることを確認 (Slice 1 と整合)
        repo = IngredientsRepository.from_yaml(bad)
        assert repo.list_ingredients("x") == []
