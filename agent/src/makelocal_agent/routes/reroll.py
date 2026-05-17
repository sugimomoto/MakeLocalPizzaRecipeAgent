"""POST /agent/reroll — sessionId を salt にして別 seed で 3 案を再生成。

Slice 2 では Web 側が generate-candidates と同じ localeId/ingredients を
リクエストボディに同送するのではなく、サーバが sessionId の hash で新しい seed を
作って同じ仕組みで生成し直す。実 LLM 呼び出しでは入力プロンプトに「reroll: 別案を」と
hint を足す程度。

簡略実装:
- 同じ /generate-candidates ロジックを呼び出す前提で、sessionId のみ受け取る
- 入力 (localeId/ingredients) は呼び出し側がクライアントヘッダで pass-through する設計に
  すべきだが、Slice 2 では同じく body で受け取る方が API シンプル
- Web 側 (HttpAgentClient) の reroll メソッドは sessionId のみ送る方針 (design.md §7.1)
- → 本 Slice では再生成のためのコンテキストを保持しない。代わりに 422 を返して
  Web 側で localeId/ingredients を含む別エンドポイントに切り替える
- ただし契約維持のため /agent/reroll は実装する。本実装は 「ボディに localeId と
  ingredients を含めて送ってもらう」 約束に変更 (Slice 1 mock との差分はドキュメント化)
"""

from __future__ import annotations

from collections.abc import AsyncIterator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from ..agents.orchestrator import generate_three_candidates
from ..deps import get_llm_client
from ..lib.ndjson import encode_ndjson_stream
from .candidates import _get_repo, _resolve_inputs  # 内部利用 OK

router = APIRouter(prefix="/agent")


class RerollRequest(BaseModel):
    """reroll では既存 sessionId と新セッション ID + localeId/ingredients を再送する。"""

    sourceSessionId: str = Field(min_length=1)
    sessionId: str = Field(min_length=1)
    localeId: str = Field(min_length=1)
    ingredients: list[str] = Field(min_length=1)
    guestSessionId: str | None = None


@router.post("/reroll")
async def reroll(req: RerollRequest) -> StreamingResponse:
    # localeId/ingredients の解決は generate-candidates と同じロジック
    from .candidates import GenerateCandidatesRequest  # noqa: PLC0415

    inner = GenerateCandidatesRequest(
        sessionId=req.sessionId,
        localeId=req.localeId,
        ingredients=req.ingredients,
        guestSessionId=req.guestSessionId,
    )
    selected, hints = _resolve_inputs(inner)
    repo = _get_repo()
    locale = repo.find_locale(req.localeId)
    assert locale is not None

    client = get_llm_client()

    async def gen() -> AsyncIterator[bytes]:
        # reroll は新しい sessionId を session_id として使い、新たな seed として機能させる。
        # (LLM プロンプトに seed を渡さなくても、Gemini の temperature と新しい session_id 由来
        #  の内部状態で異なる結果になる想定。)
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
            "x-mlpr-source-session-id": req.sourceSessionId,
            "x-mlpr-session-id": req.sessionId,
        },
    )
