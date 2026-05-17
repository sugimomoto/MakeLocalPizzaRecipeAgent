"""AdkLlmClient — Google ADK + Vertex AI 経由で Gemini を呼ぶ実装。

毎回 LlmAgent を build → InMemorySessionService の使い捨てセッションで Runner.run_async
→ 構造化出力 (output_schema) を取り出して Pydantic インスタンスを返す。

注意:
- ADK 1.33 ベース。後の版で signature が変わる可能性あり。
- agent.output_schema を指定すると LlmAgent が JSON テキストを返す。最終 event の content から
  parse して output_schema(**...) を構築する。
- 実呼び出しは Vertex AI コストがかかるため、CI/ユニットテストでは MockLlmClient を使う。
"""

from __future__ import annotations

import json
import uuid
from typing import Any

from google.adk import Runner
from google.adk.agents import LlmAgent
from google.adk.sessions import InMemorySessionService
from google.genai import types as genai_types
from pydantic import BaseModel

_APP_NAME = "mlpr-agent"
_USER_ID = "internal"


class AdkLlmClient:
    """ADK LlmAgent + Vertex AI で構造化出力を取得する。"""

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
        agent = LlmAgent(
            name=f"oneshot_{uuid.uuid4().hex[:8]}",
            model=model,
            instruction=instruction,
            output_schema=output_schema,
        )
        session_service = InMemorySessionService()  # type: ignore[no-untyped-call]
        runner = Runner(
            app_name=_APP_NAME,
            agent=agent,
            session_service=session_service,
            auto_create_session=True,
        )

        message = genai_types.Content(
            role="user",
            parts=[genai_types.Part.from_text(text=prompt)],
        )

        last_text: str | None = None
        try:
            async for event in runner.run_async(
                user_id=_USER_ID,
                session_id=uuid.uuid4().hex,
                new_message=message,
            ):
                if not event.is_final_response():
                    continue
                if event.content and event.content.parts:
                    for part in event.content.parts:
                        text = getattr(part, "text", None)
                        if text:
                            last_text = text
        finally:
            await runner.close()  # type: ignore[no-untyped-call]

        if not last_text:
            msg = "Adk Runner returned no final text"
            raise RuntimeError(msg)

        try:
            raw: dict[str, Any] = json.loads(last_text)
        except json.JSONDecodeError as exc:
            msg = f"Failed to parse Gemini structured output as JSON: {last_text[:200]}"
            raise RuntimeError(msg) from exc

        return output_schema.model_validate(raw)
