"""楽天 Web Service の IchibaItem/Search API クライアント (新エンドポイント版)。

新エンドポイント: ``openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260401``

新仕様の特徴 (2026-05 実証ベース、姉妹プロジェクトの retrospective より):
- ``applicationId`` は **UUID 形式** (旧の数字 ID ではない)
- ``accessKey`` ヘッダ必須 (``pk_`` プレフィックスの publishable key 形式)
- レスポンスは ``Items[].Item.{...}`` ラッパ形式
- **新エンドポイントでは ``genreId=561023`` (ふるさと納税) を指定すると count=0**。
  ふるさと納税の絞込は keyword に「ふるさと納税」を AND 結合 + normalize 段で
  「【ふるさと納税】」プレフィックス検証で行う。

旧エンドポイント (``app.rakuten.co.jp/services/api/...``) は UUID 形式 applicationId を
受け付けず HTTP 400 ``wrong_parameter`` を返すため、本クライアントでは扱わない。
"""

from __future__ import annotations

import asyncio
import time
from typing import Any

import httpx

# 新エンドポイント (UUID applicationId + accessKey ヘッダ必須)
RAKUTEN_API_BASE = "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260401"

# レート制限: 1 applicationId につき 1 req/秒 (公式 FAQ 明記)。安全側に 1.05s。
_MIN_INTERVAL_SEC = 1.05

# ふるさと納税絞込キーワード。新エンドポイントでは genreId=561023 が機能しないため、
# keyword 側で AND 結合して絞り込む。
FURUSATO_KEYWORD = "ふるさと納税"


class RakutenClient:
    """楽天 IchibaItem/Search のラッパ (新エンドポイント版)。

    Args:
        application_id: Rakuten Web Service の Application ID (UUID 形式、必須)
        access_key: accessKey ヘッダ用のキー (``pk_`` プレフィックス、必須)
        affiliate_id: 楽天アフィリエイト ID (任意)。指定すると affiliateUrl /
                      affiliateRate / shopAffiliateUrl がレスポンスに含まれる。
        client: テストで差替え可能な httpx.AsyncClient
        min_interval_sec: レート制限。本番は ``_MIN_INTERVAL_SEC`` のまま。
    """

    def __init__(
        self,
        application_id: str,
        access_key: str,
        affiliate_id: str | None = None,
        *,
        client: httpx.AsyncClient | None = None,
        min_interval_sec: float = _MIN_INTERVAL_SEC,
    ) -> None:
        if not application_id:
            raise ValueError("application_id is required")
        if not access_key:
            raise ValueError("access_key is required (new endpoint requires accessKey header)")
        self.application_id = application_id
        self.access_key = access_key
        self.affiliate_id = affiliate_id
        self._client = client
        self._owned_client = client is None
        self._lock = asyncio.Lock()
        self._last_call_at: float | None = None
        self._min_interval_sec = min_interval_sec

    async def __aenter__(self) -> RakutenClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=httpx.Timeout(15.0))
            self._owned_client = True
        return self

    async def __aexit__(self, *exc_info: object) -> None:
        if self._owned_client and self._client is not None:
            await self._client.aclose()
            self._client = None

    async def search_furusato(
        self,
        keyword: str,
        *,
        max_items: int = 3,
        max_donation_yen: int | None = None,
    ) -> list[dict[str, Any]]:
        """ふるさと納税商品を検索する。

        Args:
            keyword: 検索キーワード (ふるさと納税の AND は内部で自動付与)。
            max_items: 取得する上限件数 (1〜30)。1 ページあたり 30 件まで。
            max_donation_yen: 寄附額の上限 (円)。None なら無制限。

        Returns:
            楽天 API レスポンスの ``Items[]`` をそのまま返す (Items の中身は
            ``{"Item": {...}}`` ラップ形式)。空なら ``[]``。

        Raises:
            httpx.HTTPStatusError: 4xx / 5xx
        """
        keyword_with_furusato = f"{keyword} {FURUSATO_KEYWORD}".strip()
        params: dict[str, Any] = {
            "applicationId": self.application_id,
            "keyword": keyword_with_furusato,
            "hits": min(max(max_items, 1), 30),
            "format": "json",
            "formatVersion": 1,
        }
        if self.affiliate_id:
            params["affiliateId"] = self.affiliate_id
        if max_donation_yen is not None:
            params["maxPrice"] = max_donation_yen

        await self._respect_rate_limit()
        client = await self._ensure_client()
        headers = {"accessKey": self.access_key}
        resp = await client.get(RAKUTEN_API_BASE, params=params, headers=headers)
        resp.raise_for_status()
        body: dict[str, Any] = resp.json()
        items_raw = body.get("Items", [])
        if not isinstance(items_raw, list):
            return []
        return items_raw

    async def _ensure_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=httpx.Timeout(15.0))
            self._owned_client = True
        return self._client

    async def _respect_rate_limit(self) -> None:
        """1 req/秒 制約を満たすよう前回呼び出しから ``_min_interval_sec`` 待つ。"""
        async with self._lock:
            now = time.monotonic()
            if self._last_call_at is not None:
                elapsed = now - self._last_call_at
                wait = self._min_interval_sec - elapsed
                if wait > 0:
                    await asyncio.sleep(wait)
            self._last_call_at = time.monotonic()
