"""lib/ndjson.py のテスト。"""

from __future__ import annotations

import json
from collections.abc import AsyncIterator

import pytest

from makelocal_agent.domain.stream import (
    CandidateStartEvent,
    SessionDoneEvent,
    SessionStartEvent,
    StreamEvent,
)
from makelocal_agent.lib.ndjson import encode_ndjson_stream, to_ndjson_line


class TestToNdjsonLine:
    def test_ends_with_single_newline(self) -> None:
        event = SessionDoneEvent(sessionId="sess_x")
        line = to_ndjson_line(event)
        assert line.endswith(b"\n")
        # \n は 1 個のみ (前 byte は }) — 末尾が "}\\n"
        assert not line[:-1].endswith(b"\n")

    def test_payload_is_valid_json_with_camel_case_keys(self) -> None:
        event = SessionStartEvent(sessionId="sess_x", strategies=["exploit", "tune", "explore"])
        line = to_ndjson_line(event)
        obj = json.loads(line.decode("utf-8").rstrip("\n"))
        assert obj["type"] == "session.start"
        assert obj["sessionId"] == "sess_x"
        assert obj["strategies"] == ["exploit", "tune", "explore"]


class TestEncodeNdjsonStream:
    @pytest.mark.asyncio
    async def test_emits_one_line_per_event(self) -> None:
        async def gen() -> AsyncIterator[StreamEvent]:
            yield SessionStartEvent(sessionId="s1", strategies=["exploit", "tune", "explore"])
            yield CandidateStartEvent(strategy="exploit", candidateId="c1")
            yield SessionDoneEvent(sessionId="s1")

        chunks = [chunk async for chunk in encode_ndjson_stream(gen())]
        assert len(chunks) == 3
        for c in chunks:
            assert c.endswith(b"\n")
            # 各 chunk は単独で JSON parseable
            json.loads(c.decode("utf-8").rstrip("\n"))

    @pytest.mark.asyncio
    async def test_empty_stream_yields_nothing(self) -> None:
        async def gen() -> AsyncIterator[StreamEvent]:
            return
            yield  # pragma: no cover  generator にするための dead yield

        chunks = [chunk async for chunk in encode_ndjson_stream(gen())]
        assert chunks == []
