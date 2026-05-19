# =============================================================================
# Dockerfile — Agent (FastAPI + uvicorn) for Cloud Run / docker
# =============================================================================
# Multi-stage build:
#   1. builder : uv で .venv を作る (frozen + no-dev)
#   2. runner  : minimal python3.12 image、.venv をコピーして uvicorn 起動
#
# Cloud Run の規約:
#   - PORT env (デフォルト 8080) を listen
#   - 0.0.0.0 で bind
#   - 健全性: GET /agent/health が 200
# =============================================================================

# ---- 1. builder --------------------------------------------------------------
FROM python:3.12-slim-bookworm AS builder

# uv をコピー (https://github.com/astral-sh/uv/pkgs/container/uv)
COPY --from=ghcr.io/astral-sh/uv:0.5.11 /uv /uvx /usr/local/bin/

WORKDIR /app

# uv の挙動を Docker 向けに調整
#   - sync 中の link-mode warning を避ける (copy で安全側)
#   - .venv の場所を固定
ENV UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/app/.venv \
    UV_COMPILE_BYTECODE=1

# lock + project ファイルだけ先にコピー → cache 効きやすく
COPY pyproject.toml uv.lock ./

# dependency layer (src は後)
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-install-project

# プロジェクト本体 + ランタイム必要ファイルをコピー
COPY src ./src
COPY data ./data

# プロジェクト自身をインストール
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

# ---- 2. runner ---------------------------------------------------------------
FROM python:3.12-slim-bookworm AS runner

WORKDIR /app

# Cloud Run 規約
ENV PORT=8080 \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/app/.venv/bin:${PATH}"

# 非 root ユーザ
RUN groupadd --system --gid 1001 app && \
    useradd --system --uid 1001 --gid app --create-home app

# builder から .venv + src + data をコピー
COPY --from=builder --chown=app:app /app/.venv /app/.venv
COPY --from=builder --chown=app:app /app/src /app/src
COPY --from=builder --chown=app:app /app/data /app/data

USER app

EXPOSE 8080

# uvicorn を直接呼ぶ (uv run を挟むとシェル経由になるためコールドスタートに不利)
# Cloud Run は SIGTERM を送ってくるので uvicorn の graceful shutdown に任せる
CMD ["sh", "-c", "uvicorn makelocal_agent.main:app --host 0.0.0.0 --port ${PORT}"]
