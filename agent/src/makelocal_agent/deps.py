"""DI: LLM クライアントの取得 (ADK + Vertex 実装 / Mock 実装の切替)。

設計判断:
- ADK の Runner を毎回 spin up すると重い。LlmClient プロトコルを噛ませて、
  テスト / オフライン開発では MockLlmClient で即値返却に切替可能にする。
- 実 Gemini 呼び出しは AdkLlmClient (T-232 で実装) が担当。
- settings.use_mock_llm = True または GOOGLE_CLOUD_PROJECT 未設定なら Mock。
"""

from __future__ import annotations

from typing import Protocol

from pydantic import BaseModel

from .lib.settings import Settings, get_settings


class LlmClient(Protocol):
    """LLM への単発構造化出力呼び出しの抽象。

    output_schema 型の Pydantic インスタンスを返す。
    """

    async def run_structured(
        self,
        *,
        model: str,
        instruction: str,
        prompt: str,
        output_schema: type[BaseModel],
    ) -> BaseModel: ...


class MockLlmClient:
    """テスト・オフライン用ダミー。output_schema の field を機械的に埋める。

    Pydantic field の必須項目を以下のルールで埋める:
    - str: f"mock-{field_name}"
    - list[str]: ["mock-1", "mock-2"]
    - その他: 既定値 (Pydantic デフォルト or None)
    """

    async def run_structured(
        self,
        *,
        model: str,
        instruction: str,
        prompt: str,
        output_schema: type[BaseModel],
    ) -> BaseModel:
        kwargs: dict[str, object] = {}
        for fname, finfo in output_schema.model_fields.items():
            ann = finfo.annotation
            if ann is str:
                kwargs[fname] = f"mock-{fname}"
            elif ann == list[str]:
                kwargs[fname] = [f"mock-{fname}-1", f"mock-{fname}-2"]
            else:
                # 試しに None を渡す (失敗する型は呼び出し側で test)
                kwargs[fname] = None
        return output_schema(**kwargs)


_singleton: LlmClient | None = None


def get_llm_client(settings: Settings | None = None) -> LlmClient:
    """プロセス内シングルトン。settings.use_mock_llm または ADC 未設定で Mock。"""
    global _singleton  # noqa: PLW0603  process-wide singleton
    if _singleton is not None:
        return _singleton
    s = settings or get_settings()
    if s.use_mock_llm or not s.google_cloud_project:
        _singleton = MockLlmClient()
    else:
        # 遅延 import (ADK は重く、テスト時に常に import すると遅い)
        from .agents.adk_client import AdkLlmClient  # noqa: PLC0415

        _singleton = AdkLlmClient(
            project=s.google_cloud_project,
            location=s.vertex_ai_location,
        )
    return _singleton


def reset_llm_client_for_testing() -> None:
    global _singleton  # noqa: PLW0603  process-wide singleton
    _singleton = None


def set_llm_client_for_testing(client: LlmClient) -> None:
    """テストから具体的な LlmClient を注入する (e.g. unittest.mock.AsyncMock)。"""
    global _singleton  # noqa: PLW0603  process-wide singleton
    _singleton = client
