"""POST /agent/recipes/{candidate_id} — 詳細レシピ + Imagen 画像の NDJSON ストリーム。"""

from __future__ import annotations

from collections.abc import AsyncIterator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from ..agents.recipe_orchestrator import generate_recipe_detail
from ..deps import get_imagen_client, get_llm_client
from ..domain.candidate import Candidate
from ..lib.ndjson import encode_ndjson_stream
from .candidates import _get_repo

router = APIRouter(prefix="/agent")


class GenerateRecipeRequest(BaseModel):
    localeId: str = Field(min_length=1)
    ingredients: list[str] = Field(min_length=1)
    candidate: Candidate
    guestSessionId: str | None = None


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
    repo = _get_repo()
    locale = repo.find_locale(req.localeId)
    if locale is None:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "LOCALE_NOT_FOUND", "message": req.localeId}},
        )

    all_ings = repo.list_ingredients(req.localeId) or []
    by_id = {ing.id: ing for ing in all_ings}
    selected = []
    for ing_id in req.ingredients:
        ing = by_id.get(ing_id)
        if ing is None:
            raise HTTPException(
                status_code=400,
                detail={"error": {"code": "INGREDIENT_NOT_FOUND", "message": ing_id}},
            )
        selected.append(ing)

    llm = get_llm_client()
    imagen = get_imagen_client()

    async def gen() -> AsyncIterator[bytes]:
        events = generate_recipe_detail(
            llm_client=llm,
            imagen_client=imagen,
            recipe_id=candidate_id,
            locale=locale,
            selected=selected,
            candidate=req.candidate,
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
