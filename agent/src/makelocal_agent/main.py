"""FastAPI entry point.

uvicorn から呼び出される `app` を提供する。

ローカル起動:
    uv run uvicorn makelocal_agent.main:app --port 8080 --reload
"""

from fastapi import FastAPI

app = FastAPI(
    title="makelocal-agent",
    version="0.2.0",
    description="Python ADK + Vertex Gemini で 3 案を NDJSON ストリームで返す。",
)


@app.get("/")
def root() -> dict[str, str]:
    """疎通確認用のルート。T-241 で /agent/health に置き換え予定。"""
    return {"service": "makelocal-agent", "status": "ok"}
