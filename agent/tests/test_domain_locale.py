"""src/domain/locale.py のテスト — TS 側 src/domain/locale.test.ts と等価。"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from makelocal_agent.domain.locale import REGIONS, City, Locale, is_region


class TestRegion:
    def test_contains_exactly_8_japanese_regions(self) -> None:
        assert REGIONS == (
            "hokkaido",
            "tohoku",
            "kanto",
            "chubu",
            "kinki",
            "chugoku",
            "shikoku",
            "kyushu-okinawa",
        )
        assert len(REGIONS) == 8

    def test_is_region_accepts_every_value_in_regions(self) -> None:
        for r in REGIONS:
            assert is_region(r) is True

    def test_is_region_rejects_unknown_strings_numbers_and_none(self) -> None:
        assert is_region("okinawa") is False  # 沖縄は kyushu-okinawa に含む
        assert is_region("Tohoku") is False  # case-sensitive
        assert is_region(0) is False
        assert is_region(None) is False


class TestLocale:
    def test_accepts_a_minimal_valid_locale_no_cities(self) -> None:
        locale = Locale(
            id="miyagi",
            prefecture="宮城県",
            prefectureCode="JP-04",
            region="tohoku",
        )
        assert locale.id == "miyagi"
        assert locale.cities is None

    def test_accepts_locale_with_cities(self) -> None:
        sendai = City(id="sendai", name="仙台市")
        locale = Locale(
            id="miyagi-sendai",
            prefecture="宮城県",
            prefectureCode="JP-04",
            region="tohoku",
            cities=[sendai],
        )
        assert locale.cities is not None
        assert locale.cities[0] == sendai

    def test_rejects_invalid_prefecture_code_format(self) -> None:
        with pytest.raises(ValidationError):
            Locale(
                id="miyagi",
                prefecture="宮城県",
                prefectureCode="04",  # JP- prefix なし
                region="tohoku",
            )

    def test_rejects_unknown_region(self) -> None:
        with pytest.raises(ValidationError):
            Locale(
                id="miyagi",
                prefecture="宮城県",
                prefectureCode="JP-04",
                region="oceania",
            )

    def test_rejects_empty_id(self) -> None:
        with pytest.raises(ValidationError):
            Locale(
                id="",
                prefecture="宮城県",
                prefectureCode="JP-04",
                region="tohoku",
            )


class TestCity:
    def test_rejects_empty_id_or_name(self) -> None:
        with pytest.raises(ValidationError):
            City(id="", name="仙台市")
        with pytest.raises(ValidationError):
            City(id="sendai", name="")
