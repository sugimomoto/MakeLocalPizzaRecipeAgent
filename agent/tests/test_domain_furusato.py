"""src/domain/furusato.py のテスト — Slice 5 ふるさと納税ドメイン。

TypeScript の src/domain/furusato.ts と shape を揃えていることを担保するため、
両言語で共通の sample payload を Pydantic と (将来) Zod で round-trip できることを
verify する。
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from makelocal_agent.domain.furusato import FurusatoItem, FurusatoItemsDoc


def _valid_item() -> dict[str, object]:
    return {
        "itemId": "shop-A:rakuten-item-1",
        "ingredientId": "miyagi-oyster",
        "platform": "rakuten",
        "title": "【ふるさと納税】宮城県松島町 三陸産生牡蠣 1kg 殻付き",
        "municipality": "宮城県松島町",
        "producer": "松島漁業協同組合",
        "donationAmount": 12000,
        "url": "https://item.rakuten.co.jp/shop/abc/",
        "affiliateUrl": "https://hb.afl.rakuten.co.jp/...",
        "imageUrl": "https://thumbnail.image.rakuten.co.jp/...",
        "inStock": True,
        "fetchedAt": "2026-05-19T00:00:00.000Z",
    }


class TestFurusatoItem:
    def test_accepts_full_payload(self) -> None:
        item = FurusatoItem.model_validate(_valid_item())
        assert item.itemId == "shop-A:rakuten-item-1"
        assert item.ingredientId == "miyagi-oyster"
        assert item.platform == "rakuten"
        assert item.donationAmount == 12000
        assert item.inStock is True

    def test_producer_and_optional_urls_default_to_none(self) -> None:
        data = _valid_item()
        del data["producer"]
        del data["affiliateUrl"]
        del data["imageUrl"]
        item = FurusatoItem.model_validate(data)
        assert item.producer is None
        assert item.affiliateUrl is None
        assert item.imageUrl is None

    def test_in_stock_defaults_to_true(self) -> None:
        data = _valid_item()
        del data["inStock"]
        item = FurusatoItem.model_validate(data)
        assert item.inStock is True

    def test_rejects_zero_donation(self) -> None:
        data = _valid_item()
        data["donationAmount"] = 0
        with pytest.raises(ValidationError):
            FurusatoItem.model_validate(data)

    def test_rejects_negative_donation(self) -> None:
        data = _valid_item()
        data["donationAmount"] = -1
        with pytest.raises(ValidationError):
            FurusatoItem.model_validate(data)

    def test_rejects_empty_title(self) -> None:
        data = _valid_item()
        data["title"] = ""
        with pytest.raises(ValidationError):
            FurusatoItem.model_validate(data)

    def test_rejects_unknown_platform(self) -> None:
        data = _valid_item()
        data["platform"] = "amazon"
        with pytest.raises(ValidationError):
            FurusatoItem.model_validate(data)

    def test_rejects_extra_fields_silently_no_more(self) -> None:
        # ConfigDict(extra='forbid') にしているので、未知フィールドは弾く
        data = _valid_item()
        data["unknownField"] = "should-fail"
        with pytest.raises(ValidationError):
            FurusatoItem.model_validate(data)

    def test_round_trip(self) -> None:
        item = FurusatoItem.model_validate(_valid_item())
        dumped = item.model_dump()
        # Pydantic round-trip
        reparsed = FurusatoItem.model_validate(dumped)
        assert reparsed == item


class TestFurusatoItemsDoc:
    def test_accepts_zero_items(self) -> None:
        doc = FurusatoItemsDoc.model_validate(
            {
                "ingredientId": "miyagi-oyster",
                "items": [],
                "refreshedAt": "2026-05-19T00:00:00.000Z",
                "ttlExpiresAt": "2026-05-26T00:00:00.000Z",
            }
        )
        assert doc.items == []

    def test_accepts_multiple_items(self) -> None:
        items = [_valid_item(), {**_valid_item(), "itemId": "shop-B:rakuten-item-2"}]
        doc = FurusatoItemsDoc.model_validate(
            {
                "ingredientId": "miyagi-oyster",
                "items": items,
                "refreshedAt": "2026-05-19T00:00:00.000Z",
                "ttlExpiresAt": "2026-05-26T00:00:00.000Z",
            }
        )
        assert len(doc.items) == 2
        assert doc.items[1].itemId == "shop-B:rakuten-item-2"
