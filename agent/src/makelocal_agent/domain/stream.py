"""NDJSON ストリーム契約の Pydantic モデル — TS 側 schemas.ts と semantic 同期。

- 10 種類のイベントを discriminated union (Annotated[..., Field(discriminator="type")])
- TypeAdapter でリストとしての validation も提供
- model_dump_json(by_alias=False) の出力が Zod 側 StreamEventSchema で parse 可能
"""

from __future__ import annotations

from typing import Annotated, Literal

from pydantic import BaseModel, Field, TypeAdapter

from .candidate import Strategy


class SessionStartEvent(BaseModel):
    type: Literal["session.start"] = "session.start"
    sessionId: str = Field(min_length=1)
    strategies: list[Strategy] = Field(min_length=1)


class CandidateStartEvent(BaseModel):
    type: Literal["candidate.start"] = "candidate.start"
    strategy: Strategy
    candidateId: str = Field(min_length=1)


class CandidateTitleEvent(BaseModel):
    type: Literal["candidate.title"] = "candidate.title"
    candidateId: str = Field(min_length=1)
    title: str = Field(min_length=1)


class CandidateConceptEvent(BaseModel):
    type: Literal["candidate.concept"] = "candidate.concept"
    candidateId: str = Field(min_length=1)
    concept: str = Field(min_length=1)


class CandidateIngredientsEvent(BaseModel):
    type: Literal["candidate.ingredients"] = "candidate.ingredients"
    candidateId: str = Field(min_length=1)
    ingredients: list[str]


class CandidateSceneTagsEvent(BaseModel):
    type: Literal["candidate.sceneTags"] = "candidate.sceneTags"
    candidateId: str = Field(min_length=1)
    sceneTags: list[str]


class CandidateWhyEvent(BaseModel):
    type: Literal["candidate.why"] = "candidate.why"
    candidateId: str = Field(min_length=1)
    why: str = Field(min_length=1)


class CandidateDoneEvent(BaseModel):
    type: Literal["candidate.done"] = "candidate.done"
    candidateId: str = Field(min_length=1)


class SessionDoneEvent(BaseModel):
    type: Literal["session.done"] = "session.done"
    sessionId: str = Field(min_length=1)


class ErrorEvent(BaseModel):
    type: Literal["error"] = "error"
    code: str = Field(min_length=1)
    message: str = Field(min_length=1)


StreamEvent = Annotated[
    SessionStartEvent
    | CandidateStartEvent
    | CandidateTitleEvent
    | CandidateConceptEvent
    | CandidateIngredientsEvent
    | CandidateSceneTagsEvent
    | CandidateWhyEvent
    | CandidateDoneEvent
    | SessionDoneEvent
    | ErrorEvent,
    Field(discriminator="type"),
]
"""Discriminated union: type フィールドで具象クラスを決定する。"""


StreamEventAdapter: TypeAdapter[StreamEvent] = TypeAdapter(StreamEvent)
"""dict / JSON 文字列から StreamEvent をパース・検証するためのアダプタ。"""


def parse_stream_event(value: object) -> StreamEvent:
    """任意の dict / 既存インスタンスを StreamEvent として検証する。

    違反は pydantic.ValidationError を raise する。
    """
    return StreamEventAdapter.validate_python(value)
