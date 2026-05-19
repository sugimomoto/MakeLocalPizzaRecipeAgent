"""RakutenClient のテスト (新エンドポイント版)。

httpx.MockTransport で API リクエスト / レスポンスを fixture 化し、
- accessKey ヘッダ送信
- keyword への「ふるさと納税」AND 結合
- レート制限 (1.05s/req) の遵守
- パラメータ (hits / maxPrice / affiliateId)
を verify する。実楽天 API には繋がない。
"""

from __future__ import annotations

import time
from typing import Any

import httpx
import pytest

from makelocal_agent.furusato.rakuten_client import (
    FURUSATO_KEYWORD,
    RAKUTEN_API_BASE,
    RakutenClient,
)


def _ok_response(items: list[dict[str, Any]] | None = None) -> httpx.Response:
    return httpx.Response(
        200,
        json={
            "Items": items or [],
            "count": len(items or []),
            "page": 1,
            "first": 1,
            "last": 0,
            "hits": 0,
            "carrier": 0,
            "pageCount": 1,
            "GenreInformation": [],
            "TagInformation": [],
        },
    )


class TestRakutenClient:
    def test_requires_application_id(self) -> None:
        with pytest.raises(ValueError, match="application_id"):
            RakutenClient(application_id="", access_key="pk_x")

    def test_requires_access_key(self) -> None:
        with pytest.raises(ValueError, match="access_key"):
            RakutenClient(application_id="uuid-x", access_key="")

    @pytest.mark.asyncio
    async def test_appends_furusato_keyword_and_sends_access_key_header(self) -> None:
        captured: dict[str, Any] = {}

        def handler(req: httpx.Request) -> httpx.Response:
            captured["url"] = str(req.url)
            captured["params"] = dict(req.url.params)
            captured["headers"] = dict(req.headers)
            return _ok_response()

        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as raw:
            client = RakutenClient(
                application_id="uuid-app",
                access_key="pk_test_123",
                client=raw,
                min_interval_sec=0.0,
            )
            await client.search_furusato("せり 宮城", max_items=2)

        # URL は新エンドポイント
        assert captured["url"].startswith(RAKUTEN_API_BASE)
        # keyword に「ふるさと納税」が AND 結合されている
        assert FURUSATO_KEYWORD in captured["params"]["keyword"]
        assert "せり 宮城" in captured["params"]["keyword"]
        # accessKey ヘッダが送られている
        assert captured["headers"]["accesskey"] == "pk_test_123"
        # applicationId / hits も入っている
        assert captured["params"]["applicationId"] == "uuid-app"
        assert captured["params"]["hits"] == "2"

    @pytest.mark.asyncio
    async def test_returns_items_array_from_response(self) -> None:
        sample = [
            {
                "Item": {
                    "itemCode": "shop:1",
                    "itemName": "【ふるさと納税】X",
                    "itemPrice": 12000,
                    "itemUrl": "https://item.rakuten.co.jp/x",
                }
            }
        ]
        transport = httpx.MockTransport(lambda _req: _ok_response(sample))
        async with httpx.AsyncClient(transport=transport) as raw:
            client = RakutenClient("uuid", "pk_x", client=raw, min_interval_sec=0.0)
            items = await client.search_furusato("せり")
            assert items == sample

    @pytest.mark.asyncio
    async def test_passes_max_donation_yen_as_max_price(self) -> None:
        captured: dict[str, Any] = {}

        def handler(req: httpx.Request) -> httpx.Response:
            captured["params"] = dict(req.url.params)
            return _ok_response()

        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as raw:
            client = RakutenClient("uuid", "pk_x", client=raw, min_interval_sec=0.0)
            await client.search_furusato("X", max_donation_yen=20000)
        assert captured["params"]["maxPrice"] == "20000"

    @pytest.mark.asyncio
    async def test_passes_affiliate_id_when_provided(self) -> None:
        captured: dict[str, Any] = {}

        def handler(req: httpx.Request) -> httpx.Response:
            captured["params"] = dict(req.url.params)
            return _ok_response()

        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as raw:
            client = RakutenClient(
                "uuid", "pk_x", affiliate_id="aff-123", client=raw, min_interval_sec=0.0
            )
            await client.search_furusato("X")
        assert captured["params"]["affiliateId"] == "aff-123"

    @pytest.mark.asyncio
    async def test_omits_affiliate_id_when_not_provided(self) -> None:
        captured: dict[str, Any] = {}

        def handler(req: httpx.Request) -> httpx.Response:
            captured["params"] = dict(req.url.params)
            return _ok_response()

        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as raw:
            client = RakutenClient("uuid", "pk_x", client=raw, min_interval_sec=0.0)
            await client.search_furusato("X")
        assert "affiliateId" not in captured["params"]

    @pytest.mark.asyncio
    async def test_rate_limit_enforces_minimum_interval(self) -> None:
        transport = httpx.MockTransport(lambda _req: _ok_response())
        async with httpx.AsyncClient(transport=transport) as raw:
            client = RakutenClient("uuid", "pk_x", client=raw, min_interval_sec=0.15)
            t0 = time.monotonic()
            await client.search_furusato("a")
            await client.search_furusato("b")
            elapsed = time.monotonic() - t0
        # 2 回目は 1 回目から 150ms 以上空く
        assert elapsed >= 0.15

    @pytest.mark.asyncio
    async def test_raises_on_http_error(self) -> None:
        transport = httpx.MockTransport(lambda _req: httpx.Response(400, json={"error": "x"}))
        async with httpx.AsyncClient(transport=transport) as raw:
            client = RakutenClient("uuid", "pk_x", client=raw, min_interval_sec=0.0)
            with pytest.raises(httpx.HTTPStatusError):
                await client.search_furusato("X")

    @pytest.mark.asyncio
    async def test_caps_max_items_to_30(self) -> None:
        captured: dict[str, Any] = {}

        def handler(req: httpx.Request) -> httpx.Response:
            captured["params"] = dict(req.url.params)
            return _ok_response()

        transport = httpx.MockTransport(handler)
        async with httpx.AsyncClient(transport=transport) as raw:
            client = RakutenClient("uuid", "pk_x", client=raw, min_interval_sec=0.0)
            await client.search_furusato("X", max_items=100)
        assert captured["params"]["hits"] == "30"
