"""ふるさと納税返礼品の Firestore キャッシュ層。

設計:
- コレクション ``furusato_items``、document id = ingredient_id
- 各 doc は ``{ingredientId, items: FurusatoItem[], refreshedAt, ttlExpiresAt}``
- TTL を超えた doc は get で None を返す (read 側は cache miss として処理)
- agent runtime / Web SDK は read のみ。書き込みは refresh script のみ。

テスト容易性のため Protocol で抽象化し、in-memory 実装を併存させる。
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Protocol

from makelocal_agent.domain.furusato import FurusatoItem

CACHE_COLLECTION = "furusato_items"
DEFAULT_TTL_DAYS = 7


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    """Z 終端 + ミリ秒精度の ISO 8601 文字列。"""
    return dt.strftime("%Y-%m-%dT%H:%M:%S.%fZ")[:-4] + "Z"


def _parse_iso(s: str) -> datetime:
    """``_iso`` の逆変換。naive parser (Z → +00:00)。"""
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


class FurusatoCache(Protocol):
    """ふるさと納税キャッシュの抽象。read / write を両方持つが、agent runtime は
    read のみ使う前提 (write は refresh CLI で Admin SDK 経由)。
    """

    async def get(self, ingredient_id: str) -> list[FurusatoItem] | None: ...

    async def set(
        self,
        ingredient_id: str,
        items: list[FurusatoItem],
        *,
        ttl_days: int = DEFAULT_TTL_DAYS,
    ) -> None: ...


class InMemoryFurusatoCache:
    """テスト・ローカル開発用のメモリキャッシュ実装。

    プロセス内のみ。テストでは ``set`` で seed → ``get`` で検証の往復に使う。
    """

    def __init__(self) -> None:
        self._store: dict[str, dict[str, Any]] = {}

    async def get(self, ingredient_id: str) -> list[FurusatoItem] | None:
        doc = self._store.get(ingredient_id)
        if doc is None:
            return None
        if _parse_iso(doc["ttlExpiresAt"]) < _now():
            return None
        return [FurusatoItem.model_validate(i) for i in doc.get("items", [])]

    async def set(
        self,
        ingredient_id: str,
        items: list[FurusatoItem],
        *,
        ttl_days: int = DEFAULT_TTL_DAYS,
    ) -> None:
        now = _now()
        ttl_expires = now + timedelta(days=ttl_days)
        self._store[ingredient_id] = {
            "ingredientId": ingredient_id,
            "items": [i.model_dump() for i in items],
            "refreshedAt": _iso(now),
            "ttlExpiresAt": _iso(ttl_expires),
        }


class FirestoreFurusatoCache:
    """本番 / Emulator 用 Firestore 実装 (Admin SDK 経由)。

    refresh_furusato_cache.py から書き込み、agent runtime や Web は read のみ。
    Emulator に向けるときは事前に ``FIRESTORE_EMULATOR_HOST=host:port`` を
    setenv しておくこと (google-cloud-firestore SDK が見る)。
    """

    def __init__(self, *, project_id: str) -> None:
        # SDK は重いので必要時のみ import
        from google.cloud import firestore  # noqa: PLC0415  # type: ignore[import-untyped]

        self._client = firestore.Client(project=project_id)
        self._collection = self._client.collection(CACHE_COLLECTION)

    async def get(self, ingredient_id: str) -> list[FurusatoItem] | None:
        # firestore-python は同期 API だが、agent runtime からは event loop を
        # ブロックしないよう asyncio.to_thread で逃がす。
        import asyncio  # noqa: PLC0415

        snap = await asyncio.to_thread(self._collection.document(ingredient_id).get)
        if not snap.exists:
            return None
        data: dict[str, Any] = snap.to_dict() or {}
        ttl_raw = data.get("ttlExpiresAt")
        if isinstance(ttl_raw, str):
            if _parse_iso(ttl_raw) < _now():
                return None
        elif hasattr(ttl_raw, "to_datetime"):
            # Firestore Timestamp 型
            if ttl_raw.to_datetime() < _now():
                return None
        return [FurusatoItem.model_validate(i) for i in data.get("items", [])]

    async def set(
        self,
        ingredient_id: str,
        items: list[FurusatoItem],
        *,
        ttl_days: int = DEFAULT_TTL_DAYS,
    ) -> None:
        import asyncio  # noqa: PLC0415

        now = _now()
        ttl_expires = now + timedelta(days=ttl_days)
        payload = {
            "ingredientId": ingredient_id,
            "items": [i.model_dump() for i in items],
            "refreshedAt": _iso(now),
            "ttlExpiresAt": _iso(ttl_expires),
        }
        await asyncio.to_thread(self._collection.document(ingredient_id).set, payload)
