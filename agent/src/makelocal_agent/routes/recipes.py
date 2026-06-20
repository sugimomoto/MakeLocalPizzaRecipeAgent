"""POST /agent/recipes/{candidate_id} — 詳細レシピ + Imagen 画像の NDJSON ストリーム。"""

from __future__ import annotations

from collections.abc import AsyncIterator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from ..agents.recipe_orchestrator import generate_recipe_detail
from ..deps import get_imagen_client, get_llm_client, get_storage_client
from ..domain.candidate import Candidate
from ..domain.oven_profile import resolve_oven_profile
from ..lib.ndjson import encode_ndjson_stream
from .candidates import _get_repo
from .resolve import resolve_locale_and_ingredients

router = APIRouter(prefix="/agent")


class GenerateRecipeRequest(BaseModel):
    localeId: str = Field(min_length=1)
    ingredients: list[str] = Field(min_length=1)
    candidate: Candidate
    guestSessionId: str | None = None
    # Slice 8 で追加。未指定なら ENRO がデフォルト (resolve_oven_profile が解決)。
    # 未知 ID も resolve 側でデフォルトに丸めるため安全。
    ovenProfile: str | None = None


@router.post("/recipes/{candidate_id}")
async def generate_recipe(
    candidate_id: str,
    req: GenerateRecipeRequest,
) -> StreamingResponse:
    if not candidate_id:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "CANDIDATE_ID_MISSING", "message": "candidate_id required"}},
        )
    locale, selected, _ = resolve_locale_and_ingredients(_get_repo(), req.localeId, req.ingredients)

    llm = get_llm_client()
    imagen = get_imagen_client()
    storage = get_storage_client()
    oven_profile = resolve_oven_profile(req.ovenProfile)

    async def gen() -> AsyncIterator[bytes]:
        events = generate_recipe_detail(
            llm_client=llm,
            imagen_client=imagen,
            storage_client=storage,
            recipe_id=candidate_id,
            locale=locale,
            selected=selected,
            candidate=req.candidate,
            oven_profile=oven_profile,
        )
        async for chunk in encode_ndjson_stream(events):
            yield chunk

    return StreamingResponse(
        gen(),
        media_type="application/x-ndjson",
        headers={
            "cache-control": "no-store",
            "x-mlpr-recipe-id": candidate_id,
        },
    )
