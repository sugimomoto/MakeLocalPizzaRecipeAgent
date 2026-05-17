"""GET /agent/health — Cloud Run ヘルスチェック・smoke 用。"""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/agent")


@router.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}
