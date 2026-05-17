"""POST /agent/generate-candidates — 3 案 NDJSON ストリーム。"""

from __future__ import annotations

from collections.abc import AsyncIterator
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from ..agents.orchestrator import generate_three_candidates
from ..data.ingredients_repository import IngredientsRepository
from ..deps import get_llm_client
from ..domain.ingredient import Ingredient
from ..lib.ndjson import encode_ndjson_stream
from ..lib.settings import get_settings

router = APIRouter(prefix="/agent")


class GenerateCandidatesRequest(BaseModel):
    sessionId: str = Field(min_length=1)
    localeId: str = Field(min_length=1)
    ingredients: list[str] = Field(min_length=1)
    guestSessionId: str | None = None


_repo: IngredientsRepository | None = None


def _get_repo() -> IngredientsRepository:
    """Repository をプロセス内シングルトンでキャッシュ。"""
    global _repo  # noqa: PLW0603  process-wide singleton
    if _repo is None:
        s = get_settings()
        _repo = IngredientsRepository.from_yaml(Path(s.ingredients_yaml_path))
    return _repo


def _reset_repo_for_testing() -> None:
    global _repo  # noqa: PLW0603  process-wide singleton
    _repo = None


def _resolve_inputs(
    req: GenerateCandidatesRequest,
) -> tuple[list[Ingredient], list[Ingredient]]:
    """ingredients ID 配列を Ingredient リストに解決 + 補完候補 (hints) を組み立てる。

    - locale が未対応なら 404
    - ingredient ID が未知なら 400
    - hints は同 locale の中で selected に含まれない最大 5 件
    """
    repo = _get_repo()
    locale = repo.find_locale(req.localeId)
    if locale is None:
        raise HTTPException(status_code=404, detail={"error": {"code": "LOCALE_NOT_FOUND", "message": req.localeId}})

    all_ings = repo.list_ingredients(req.localeId) or []
    by_id = {ing.id: ing for ing in all_ings}
    selected: list[Ingredient] = []
    for ing_id in req.ingredients:
        ing = by_id.get(ing_id)
        if ing is None:
            raise HTTPException(
                status_code=400,
                detail={"error": {"code": "INGREDIENT_NOT_FOUND", "message": ing_id}},
            )
        selected.append(ing)
    selected_ids = {i.id for i in selected}
    hints = [i for i in all_ings if i.id not in selected_ids][:5]
    return selected, hints


@router.post("/generate-candidates")
async def generate_candidates(req: GenerateCandidatesRequest) -> StreamingResponse:
    selected, hints = _resolve_inputs(req)
    repo = _get_repo()
    locale = repo.find_locale(req.localeId)
    # _resolve_inputs が 404 を throw しているので必ず非 None
    assert locale is not None

    client = get_llm_client()

    async def gen() -> AsyncIterator[bytes]:
        events = generate_three_candidates(
            client=client,
            session_id=req.sessionId,
            locale=locale,
            selected=selected,
            hints=hints,
        )
        async for chunk in encode_ndjson_stream(events):
            yield chunk

    return StreamingResponse(
        gen(),
        media_type="application/x-ndjson",
        headers={
            "cache-control": "no-store",
            "x-mlpr-session-id": req.sessionId,
        },
    )
