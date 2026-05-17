"""FastAPI entry point.

ローカル起動:
    uv run uvicorn makelocal_agent.main:app --port 8080 --reload

ルート:
    GET  /                              疎通確認 (空応答)
    GET  /agent/health                  ヘルスチェック
    POST /agent/generate-candidates     3 案 NDJSON ストリーム生成
    POST /agent/reroll                  別 seed で再生成 (NDJSON ストリーム)
    POST /agent/recipes/{candidate_id}  詳細レシピ + Imagen 画像 NDJSON (Slice 3)
"""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from .lib.logging import get_logger
from .routes import candidates, health, recipes, reroll

app = FastAPI(
    title="makelocal-agent",
    version="0.3.0",
    description=(
        "Python ADK + Vertex Gemini で 3 案を NDJSON ストリームで返す。"
        "Slice 3 で /agent/recipes/{id} を追加し、詳細レシピ + Imagen 画像を同様に配信。"
    ),
)

app.include_router(health.router)
app.include_router(candidates.router)
app.include_router(reroll.router)
app.include_router(recipes.router)


@app.get("/")
def root() -> dict[str, str]:
    """疎通確認用のルート (Cloud Run 起動確認 / 一般スモーク)。"""
    return {"service": "makelocal-agent", "status": "ok"}


@app.exception_handler(Exception)
async def _unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """予期しない例外を {error:{code,message}} 形式の 500 で統一する。

    HTTPException は FastAPI 既定 handler が処理するため、ここには来ない。
    """
    logger = get_logger()
    logger.error(
        "unhandled exception",
        context={
            "path": str(request.url.path),
            "method": request.method,
            "error": type(exc).__name__,
            "message": str(exc),
        },
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "unexpected internal error",
            }
        },
    )
