"""furusato/cache.py のテスト — InMemoryFurusatoCache。

FirestoreFurusatoCache は実際の Emulator 接続が必要なため別途 (CI rules job で
カバー、または手動 integration テスト)。ここでは InMemory のロジックを担保する。
"""

from __future__ import annotations

from datetime import timedelta

import pytest

from makelocal_agent.domain.furusato import FurusatoItem
from makelocal_agent.furusato import cache as cache_module
from makelocal_agent.furusato.cache import (
    DEFAULT_TTL_DAYS,
    InMemoryFurusatoCache,
    _iso,
    _now,
)


def _item(ingredient_id: str, suffix: str = "1") -> FurusatoItem:
    return FurusatoItem(
        itemId=f"shop:{suffix}",
        ingredientId=ingredient_id,
        platform="rakuten",
        title=f"【ふるさと納税】X{suffix}",
        municipality="宮城県",
        producer=None,
        donationAmount=10000 + int(suffix),
        url="https://item.rakuten.co.jp/x",
        affiliateUrl=None,
        imageUrl=None,
        inStock=True,
        fetchedAt="2026-05-19T00:00:00.000Z",
    )


class TestInMemoryFurusatoCache:
    @pytest.mark.asyncio
    async def test_get_returns_none_when_not_seeded(self) -> None:
        cache = InMemoryFurusatoCache()
        assert await cache.get("miyagi-oyster") is None

    @pytest.mark.asyncio
    async def test_set_then_get_returns_items(self) -> None:
        cache = InMemoryFurusatoCache()
        items = [_item("miyagi-oyster", "1"), _item("miyagi-oyster", "2")]
        await cache.set("miyagi-oyster", items)
        loaded = await cache.get("miyagi-oyster")
        assert loaded is not None
        assert len(loaded) == 2
        assert loaded[0].itemId == "shop:1"

    @pytest.mark.asyncio
    async def test_set_overwrites_existing(self) -> None:
        cache = InMemoryFurusatoCache()
        await cache.set("miyagi-oyster", [_item("miyagi-oyster", "1")])
        await cache.set("miyagi-oyster", [_item("miyagi-oyster", "9")])
        loaded = await cache.get("miyagi-oyster")
        assert loaded is not None
        assert len(loaded) == 1
        assert loaded[0].itemId == "shop:9"

    @pytest.mark.asyncio
    async def test_default_ttl_days(self) -> None:
        assert DEFAULT_TTL_DAYS == 7

    @pytest.mark.asyncio
    async def test_expired_doc_returns_none(self) -> None:
        """ttl_days を負にすると即座に expire → get で None。"""
        cache = InMemoryFurusatoCache()
        await cache.set("miyagi-oyster", [_item("miyagi-oyster")], ttl_days=-1)
        assert await cache.get("miyagi-oyster") is None

    @pytest.mark.asyncio
    async def test_isolation_per_ingredient(self) -> None:
        cache = InMemoryFurusatoCache()
        await cache.set("miyagi-oyster", [_item("miyagi-oyster")])
        await cache.set("miyagi-seri", [_item("miyagi-seri", "2")])
        loaded_oyster = await cache.get("miyagi-oyster")
        loaded_seri = await cache.get("miyagi-seri")
        assert loaded_oyster and loaded_oyster[0].ingredientId == "miyagi-oyster"
        assert loaded_seri and loaded_seri[0].ingredientId == "miyagi-seri"

    @pytest.mark.asyncio
    async def test_empty_items_round_trip(self) -> None:
        cache = InMemoryFurusatoCache()
        await cache.set("miyagi-oyster", [])
        loaded = await cache.get("miyagi-oyster")
        assert loaded == []


class TestIsoHelpers:
    def test_iso_format_z_terminated(self) -> None:
        s = _iso(_now())
        assert s.endswith("Z")
        assert "T" in s

    def test_iso_round_trip(self) -> None:
        original = _now()
        s = _iso(original)
        parsed = cache_module._parse_iso(s)
        # 元の時刻と ±1 秒以内に一致
        assert abs((parsed - original).total_seconds()) < 1.0

    def test_iso_parse_z(self) -> None:
        s = "2026-05-19T00:00:00.000Z"
        parsed = cache_module._parse_iso(s)
        assert parsed.year == 2026
        assert parsed.month == 5
        assert parsed.day == 19


class TestExpirationEdge:
    @pytest.mark.asyncio
    async def test_ttl_just_in_future_is_still_valid(self) -> None:
        cache = InMemoryFurusatoCache()
        # 内部 store に直接書いて TTL を 1 秒先に
        from datetime import timezone  # noqa: PLC0415

        future = _now() + timedelta(seconds=1)
        cache._store["x"] = {
            "ingredientId": "x",
            "items": [_item("x").model_dump()],
            "refreshedAt": _iso(_now()),
            "ttlExpiresAt": _iso(future.astimezone(timezone.utc)),
        }
        loaded = await cache.get("x")
        assert loaded is not None
        assert len(loaded) == 1
