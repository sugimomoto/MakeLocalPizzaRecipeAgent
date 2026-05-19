"""ADK tool: ふるさと納税キャッシュから返礼品を引く。

agent runtime からの呼び出しは **キャッシュ参照のみ**。楽天 API への直接ヒットは
refresh_furusato_cache.py (手動) に閉じる。レイテンシ・レート制限・コスト対策。

Slice 5 では Web 側が Firestore を直 read するため、本 tool は **将来の ADK 用**
としての placeholder。``MLPR_FURUSATO_INTEGRATION=off`` の間は常に空リストを返す。
"""

from __future__ import annotations

from makelocal_agent.domain.furusato import FurusatoItem
from makelocal_agent.furusato.cache import FurusatoCache
from makelocal_agent.lib.settings import Settings, get_settings

# 単一プロセスで使う cache インスタンス (API ハンドラ起動時に inject される)
_cache_singleton: FurusatoCache | None = None


def configure_cache(cache: FurusatoCache | None) -> None:
    """deps.py / API 層から cache の実体を inject する。``None`` でクリア。"""
    global _cache_singleton  # noqa: PLW0603  process-wide singleton
    _cache_singleton = cache


def _is_disabled(settings: Settings | None = None) -> bool:
    """``MLPR_FURUSATO_INTEGRATION`` が False のとき tool は no-op で空リストを返す。"""
    s = settings or get_settings()
    return not s.furusato_integration


async def lookup_items_by_ingredient_id(
    ingredient_id: str,
    *,
    settings: Settings | None = None,
) -> list[FurusatoItem]:
    """ingredient_id 直接指定で cache から返礼品を引く。

    Returns:
        - settings.furusato_integration が False → 空リスト
        - cache 未注入 → 空リスト
        - cache miss / TTL 切れ → 空リスト
        - cache hit → list[FurusatoItem]
    """
    if _is_disabled(settings):
        return []
    if _cache_singleton is None:
        return []
    items = await _cache_singleton.get(ingredient_id)
    return items or []
