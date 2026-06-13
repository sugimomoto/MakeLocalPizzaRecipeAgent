"""POST /agent/generate-candidates — 3 案 NDJSON ストリーム。"""

from __future__ import annotations

from collections.abc import AsyncIterator
from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from ..agents.orchestrator import generate_three_candidates
from ..data.ingredients_repository import IngredientsRepository
from ..deps import get_llm_client
from ..domain.ingredient import Ingredient
from ..lib.ndjson import encode_ndjson_stream
from ..lib.settings import get_settings
from .resolve import resolve_locale_and_ingredients

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
    """後方互換ラッパ (reroll が利用)。共通リゾルバに委譲し (selected, hints) を返す。"""
    _, selected, hints = resolve_locale_and_ingredients(
        _get_repo(), req.localeId, req.ingredients, with_hints=True
    )
    return selected, hints


@router.post("/generate-candidates")
async def generate_candidates(req: GenerateCandidatesRequest) -> StreamingResponse:
    locale, selected, hints = resolve_locale_and_ingredients(
        _get_repo(), req.localeId, req.ingredients, with_hints=True
    )

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
