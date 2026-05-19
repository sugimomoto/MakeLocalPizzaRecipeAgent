"""FurusatoItem ドメイン型 — TypeScript の src/domain/furusato.ts と semantic 同期。

Slice 5 で導入。楽天 ふるさと納税 IchibaItem/Search API のレスポンスを
`furusato.normalize.from_rakuten_item` で射影した、アプリ視点に閉じた shape。
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class FurusatoItem(BaseModel):
    """楽天ふるさと納税 1 件分の snapshot。

    Firestore `furusato_items/{ingredientId}` ドキュメントの `items[]` 要素として保存。
    """

    model_config = ConfigDict(extra="forbid")

    # 楽天 itemCode (refresh 時に取得した一意 ID)
    itemId: str = Field(min_length=1)
    # 紐づく ingredient id (Firestore document の親キーと同じ)
    ingredientId: str = Field(min_length=1)
    # 拡張余地のため。Slice 5 では rakuten 固定
    platform: Literal["rakuten"] = "rakuten"
    # 商品タイトル (例: "【ふるさと納税】宮城県松島町 ...")
    title: str = Field(min_length=1)
    # 自治体名 (例: "宮城県松島町") — normalize.py で title から regex 抽出
    municipality: str
    # 生産者 / 提供事業者 (任意)
    producer: str | None = None
    # 寄付額 (円、>0)
    donationAmount: int = Field(gt=0)
    # 楽天 itemUrl
    url: str = Field(min_length=1)
    # 楽天 affiliateUrl (任意)
    affiliateUrl: str | None = None
    # medium image URL (任意)
    imageUrl: str | None = None
    # 在庫あり / 在庫切れの可能性
    inStock: bool = True
    # refresh 時に楽天 API から取得した時刻 (ISO 8601 文字列)
    fetchedAt: str = Field(min_length=1)


class FurusatoItemsDoc(BaseModel):
    """`furusato_items/{ingredientId}` ドキュメント全体の shape。

    `refreshedAt` / `ttlExpiresAt` は ISO 8601 文字列で保持する
    (Firestore Timestamp は read/write のレイヤで cache.py が変換)。
    """

    model_config = ConfigDict(extra="forbid")

    ingredientId: str = Field(min_length=1)
    items: list[FurusatoItem]
    refreshedAt: str = Field(min_length=1)
    ttlExpiresAt: str = Field(min_length=1)
