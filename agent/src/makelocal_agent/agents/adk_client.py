"""AdkLlmClient — Google ADK + Vertex AI 経由で Gemini を呼ぶ実装。

T-232 で実装する。ここでは LlmClient プロトコルを満たす shell のみ。
"""

from __future__ import annotations

from pydantic import BaseModel


class AdkLlmClient:
    """ADK LlmAgent + Vertex AI で構造化出力を取得する。

    T-232 で本実装。今はインスタンス化だけ可能。
    """

    def __init__(self, *, project: str, location: str) -> None:
        self.project = project
        self.location = location

    async def run_structured(
        self,
        *,
        model: str,
        instruction: str,
        prompt: str,
        output_schema: type[BaseModel],
    ) -> BaseModel:
        msg = (
            "AdkLlmClient.run_structured is not implemented yet (T-232). "
            f"Called with model={model}, instruction len={len(instruction)}, "
            f"prompt len={len(prompt)}, output_schema={output_schema.__name__}."
        )
        raise NotImplementedError(msg)
