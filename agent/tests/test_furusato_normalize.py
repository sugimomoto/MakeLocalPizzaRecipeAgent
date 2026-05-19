"""furusato/normalize.py のテスト — 楽天 raw → FurusatoItem 変換。"""

from __future__ import annotations

import pytest

from makelocal_agent.furusato.normalize import (
    _extract_municipality,
    from_rakuten_item,
    now_iso,
)


def _wrapped(item: dict[str, object]) -> dict[str, object]:
    """楽天 API の `Items[]` 形式 (Item ラップ) を作る。"""
    return {"Item": item}


def _valid_raw(**overrides: object) -> dict[str, object]:
    base: dict[str, object] = {
        "itemCode": "shop-A:item-1",
        "itemName": "【ふるさと納税】宮城県松島町 三陸産生牡蠣 1kg",
        "itemPrice": 12000,
        "itemUrl": "https://item.rakuten.co.jp/shop/abc/",
        "shopName": "松島漁業協同組合",
        "mediumImageUrls": [{"imageUrl": "https://thumb.example.com/x.jpg"}],
        "availability": 1,
    }
    base.update(overrides)
    return base


class TestFromRakutenItem:
    def test_accepts_wrapped_form(self) -> None:
        result = from_rakuten_item(_wrapped(_valid_raw()), ingredient_id="miyagi-oyster")
        assert result is not None
        assert result.itemId == "shop-A:item-1"
        assert result.ingredientId == "miyagi-oyster"
        assert result.title.startswith("【ふるさと納税】")
        assert result.donationAmount == 12000

    def test_accepts_flat_form(self) -> None:
        result = from_rakuten_item(_valid_raw(), ingredient_id="miyagi-oyster")
        assert result is not None
        assert result.itemId == "shop-A:item-1"

    def test_extracts_municipality_from_title(self) -> None:
        result = from_rakuten_item(_valid_raw(), ingredient_id="miyagi-oyster")
        assert result is not None
        assert result.municipality == "宮城県松島町"

    def test_falls_back_to_empty_municipality_when_unparseable(self) -> None:
        raw = _valid_raw(itemName="【ふるさと納税】Special Edition Oysters")
        result = from_rakuten_item(raw, ingredient_id="miyagi-oyster")
        assert result is not None
        assert result.municipality == ""

    def test_uses_shop_name_as_producer(self) -> None:
        result = from_rakuten_item(_valid_raw(), ingredient_id="miyagi-oyster")
        assert result is not None
        assert result.producer == "松島漁業協同組合"

    def test_in_stock_default_true(self) -> None:
        raw = _valid_raw()
        del raw["availability"]
        result = from_rakuten_item(raw, ingredient_id="miyagi-oyster")
        assert result is not None
        assert result.inStock is True

    def test_in_stock_false_when_availability_zero(self) -> None:
        result = from_rakuten_item(_valid_raw(availability=0), ingredient_id="miyagi-oyster")
        assert result is not None
        assert result.inStock is False

    def test_image_url_from_medium_image(self) -> None:
        result = from_rakuten_item(_valid_raw(), ingredient_id="miyagi-oyster")
        assert result is not None
        assert result.imageUrl == "https://thumb.example.com/x.jpg"

    def test_image_url_falls_back_to_small_when_medium_missing(self) -> None:
        raw = _valid_raw()
        del raw["mediumImageUrls"]
        raw["smallImageUrls"] = [{"imageUrl": "https://thumb.example.com/small.jpg"}]
        result = from_rakuten_item(raw, ingredient_id="miyagi-oyster")
        assert result is not None
        assert result.imageUrl == "https://thumb.example.com/small.jpg"

    def test_image_url_handles_string_array_form(self) -> None:
        raw = _valid_raw(mediumImageUrls=["https://thumb.example.com/raw.jpg"])
        result = from_rakuten_item(raw, ingredient_id="miyagi-oyster")
        assert result is not None
        assert result.imageUrl == "https://thumb.example.com/raw.jpg"

    def test_image_url_none_when_missing(self) -> None:
        raw = _valid_raw()
        del raw["mediumImageUrls"]
        result = from_rakuten_item(raw, ingredient_id="miyagi-oyster")
        assert result is not None
        assert result.imageUrl is None

    def test_affiliate_url_when_provided(self) -> None:
        raw = _valid_raw(affiliateUrl="https://hb.afl.rakuten.co.jp/x")
        result = from_rakuten_item(raw, ingredient_id="miyagi-oyster")
        assert result is not None
        assert result.affiliateUrl == "https://hb.afl.rakuten.co.jp/x"

    def test_fetched_at_uses_provided_value(self) -> None:
        result = from_rakuten_item(
            _valid_raw(),
            ingredient_id="miyagi-oyster",
            fetched_at="2026-05-19T00:00:00.000Z",
        )
        assert result is not None
        assert result.fetchedAt == "2026-05-19T00:00:00.000Z"

    def test_fetched_at_auto_now_when_omitted(self) -> None:
        result = from_rakuten_item(_valid_raw(), ingredient_id="miyagi-oyster")
        assert result is not None
        assert result.fetchedAt.endswith("Z")
        # iso 形式 (T 区切り) であること
        assert "T" in result.fetchedAt

    @pytest.mark.parametrize(
        "missing_field",
        ["itemCode", "itemName", "itemPrice", "itemUrl"],
    )
    def test_returns_none_when_required_field_missing(self, missing_field: str) -> None:
        raw = _valid_raw()
        del raw[missing_field]
        assert from_rakuten_item(raw, ingredient_id="miyagi-oyster") is None

    def test_returns_none_when_price_is_zero(self) -> None:
        assert from_rakuten_item(_valid_raw(itemPrice=0), ingredient_id="miyagi-oyster") is None

    def test_returns_none_when_url_not_http(self) -> None:
        raw = _valid_raw(itemUrl="javascript:alert(1)")
        assert from_rakuten_item(raw, ingredient_id="miyagi-oyster") is None

    def test_safety_net_rejects_non_furusato_item(self) -> None:
        # 「ふるさと納税」が title に含まれていない (keyword AND の取りこぼし)
        raw = _valid_raw(itemName="宮城県松島町 三陸産生牡蠣 1kg")
        assert from_rakuten_item(raw, ingredient_id="miyagi-oyster") is None


class TestMunicipalityExtraction:
    @pytest.mark.parametrize(
        ("title", "expected"),
        [
            ("【ふるさと納税】宮城県松島町 三陸産生牡蠣", "宮城県松島町"),
            ("【ふるさと納税】 北海道 利尻昆布", "北海道"),
            ("【ふるさと納税】京都府 西陣織", "京都府"),
            ("【ふるさと納税】沖縄県那覇市 アグー豚", "沖縄県那覇市"),
            ("【ふるさと納税】長野県山ノ内町 信州サーモン", "長野県山ノ内町"),
            ("Just a plain title", ""),
        ],
    )
    def test_parses_known_patterns(self, title: str, expected: str) -> None:
        assert _extract_municipality(title) == expected


class TestNowIso:
    def test_format(self) -> None:
        s = now_iso()
        assert s.endswith("Z")
        assert "T" in s
