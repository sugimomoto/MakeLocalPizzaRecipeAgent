"""furusato/tool.py のテスト — lookup_items_by_ingredient_id。

3 ケース:
- furusato_integration=off → 空リスト (cache 未参照)
- cache 未注入 → 空リスト
- cache hit → items を返す
- cache miss / TTL 切れ → 空リスト
"""

from __future__ import annotations

from collections.abc import Generator

import pytest

from makelocal_agent.domain.furusato import FurusatoItem
from makelocal_agent.furusato.cache import InMemoryFurusatoCache
from makelocal_agent.furusato.tool import (
    configure_cache,
    lookup_items_by_ingredient_id,
)
from makelocal_agent.lib.settings import Settings


def _settings(*, integration: bool, mock: bool = False) -> Settings:
    return Settings(furusato_integration=integration, use_mock_furusato=mock)


def _item(ingredient_id: str = "miyagi-oyster") -> FurusatoItem:
    return FurusatoItem(
        itemId="shop:1",
        ingredientId=ingredient_id,
        platform="rakuten",
        title="【ふるさと納税】X",
        municipality="宮城県",
        producer=None,
        donationAmount=12000,
        url="https://item.rakuten.co.jp/x",
        affiliateUrl=None,
        imageUrl=None,
        inStock=True,
        fetchedAt="2026-05-19T00:00:00.000Z",
    )


@pytest.fixture(autouse=True)
def _reset_cache_singleton() -> Generator[None, None, None]:
    """テスト前後で tool 内 singleton をクリア。"""
    configure_cache(None)
    yield
    configure_cache(None)


class TestLookupItemsByIngredientId:
    @pytest.mark.asyncio
    async def test_returns_empty_when_integration_off(self) -> None:
        cache = InMemoryFurusatoCache()
        await cache.set("miyagi-oyster", [_item()])
        configure_cache(cache)
        # integration=False → 空リスト
        result = await lookup_items_by_ingredient_id(
            "miyagi-oyster",
            settings=_settings(integration=False),
        )
        assert result == []

    @pytest.mark.asyncio
    async def test_returns_empty_when_cache_not_configured(self) -> None:
        # configure_cache を呼ばない (None のまま)
        result = await lookup_items_by_ingredient_id(
            "miyagi-oyster",
            settings=_settings(integration=True),
        )
        assert result == []

    @pytest.mark.asyncio
    async def test_returns_items_when_cache_hit(self) -> None:
        cache = InMemoryFurusatoCache()
        await cache.set("miyagi-oyster", [_item(), _item()])
        configure_cache(cache)
        result = await lookup_items_by_ingredient_id(
            "miyagi-oyster",
            settings=_settings(integration=True),
        )
        assert len(result) == 2
        assert result[0].ingredientId == "miyagi-oyster"

    @pytest.mark.asyncio
    async def test_returns_empty_when_cache_miss(self) -> None:
        cache = InMemoryFurusatoCache()
        # seed しない別の id を query
        await cache.set("miyagi-oyster", [_item()])
        configure_cache(cache)
        result = await lookup_items_by_ingredient_id(
            "nagano-shinshu-salmon",
            settings=_settings(integration=True),
        )
        assert result == []

    @pytest.mark.asyncio
    async def test_returns_empty_when_ttl_expired(self) -> None:
        cache = InMemoryFurusatoCache()
        await cache.set("miyagi-oyster", [_item()], ttl_days=-1)  # 即 expire
        configure_cache(cache)
        result = await lookup_items_by_ingredient_id(
            "miyagi-oyster",
            settings=_settings(integration=True),
        )
        assert result == []
