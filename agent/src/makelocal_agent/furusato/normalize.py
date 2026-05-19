"""楽天 IchibaItem/Search の生レスポンス → FurusatoItem に正規化する純関数。

楽天 API の `Items[]` は `{"Item": {...}}` のラップ形式と平坦形式の両方が
歴史的に観測される (バージョンによる)。両方を許容する。

safety net として、商品名に「ふるさと納税」が含まれない場合は弾く
(keyword AND の取りこぼし防止)。
"""

from __future__ import annotations

import re
from datetime import UTC, datetime
from typing import Any

from makelocal_agent.domain.furusato import FurusatoItem


def now_iso() -> str:
    """ISO 8601 (Z 終端、ミリ秒精度) の現在時刻を返す。"""
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%S.%fZ")[:-4] + "Z"


def _unwrap(raw: dict[str, Any]) -> dict[str, Any]:
    """`{"Item": {...}}` 形式は中身に展開、それ以外はそのまま返す。"""
    inner = raw.get("Item")
    if isinstance(inner, dict):
        return inner
    return raw


# 「【ふるさと納税】〇〇県〇〇町 ...」 のような頭から自治体名を抜く正規表現。
# 「〇〇県」のみ / 「〇〇県〇〇町」「〇〇県〇〇市」「〇〇県〇〇村」 など。
_MUNICIPALITY_RE = re.compile(
    r"(?:【ふるさと納税】)?\s*"
    r"([^\s/【】\[\]]+(?:都|道|府|県)(?:[^\s/【】\[\]]+(?:市|町|村|区))?)"
)


def _extract_municipality(title: str) -> str:
    """商品タイトルから自治体名を抽出。失敗時は空文字。"""
    m = _MUNICIPALITY_RE.search(title)
    if m:
        return m.group(1)
    return ""


def from_rakuten_item(
    raw: dict[str, Any],
    *,
    ingredient_id: str,
    fetched_at: str | None = None,
) -> FurusatoItem | None:
    """楽天 API の 1 件 → FurusatoItem に変換する純関数。

    必須フィールド (itemCode / itemName / itemPrice / itemUrl) が欠落するか
    商品名に「ふるさと納税」が含まれない場合は None。

    Args:
        raw: 楽天 API の Items[] 要素 (ラップ形式 / 平坦形式どちらでも可)
        ingredient_id: この item を紐づける ingredient id (必須)
        fetched_at: ISO 8601 文字列。None なら now_iso() を使う

    Returns:
        正規化された FurusatoItem、不正データなら None
    """
    item = _unwrap(raw)

    item_code = item.get("itemCode")
    item_name = item.get("itemName")
    item_price = item.get("itemPrice")
    item_url = item.get("itemUrl")
    affiliate_url = item.get("affiliateUrl")
    image_urls = item.get("mediumImageUrls") or item.get("smallImageUrls") or []

    if not (
        isinstance(item_code, str)
        and item_code
        and isinstance(item_name, str)
        and item_name
        and isinstance(item_price, int)
        and item_price > 0
        and isinstance(item_url, str)
        and item_url.startswith(("http://", "https://"))
    ):
        return None

    # safety net: keyword AND で取れたが商品名にふるさと納税の表記が無ければ弾く
    if "ふるさと納税" not in item_name:
        return None

    # 画像 URL は楽天 API では `[{"imageUrl": "..."}]` の形のことがある (formatVersion=1)
    image_url: str | None = None
    if image_urls:
        first = image_urls[0]
        if isinstance(first, dict):
            v = first.get("imageUrl")
            if isinstance(v, str):
                image_url = v
        elif isinstance(first, str):
            image_url = first

    # 在庫: itemStatus=0 が在庫切れの可能性 (実証では 1 が通常販売中)
    in_stock = item.get("availability", 1) != 0

    # 自治体名: タイトルから regex 抽出
    municipality = _extract_municipality(item_name)

    # 生産者: shopName を借用 (refresh では別途上書きも可能)
    shop_name = item.get("shopName")
    producer = shop_name if isinstance(shop_name, str) and shop_name else None

    aff: str | None
    aff = affiliate_url if isinstance(affiliate_url, str) and affiliate_url else None

    return FurusatoItem(
        itemId=item_code,
        ingredientId=ingredient_id,
        platform="rakuten",
        title=item_name,
        municipality=municipality,
        producer=producer,
        donationAmount=item_price,
        url=item_url,
        affiliateUrl=aff,
        imageUrl=image_url,
        inStock=in_stock,
        fetchedAt=fetched_at or now_iso(),
    )
