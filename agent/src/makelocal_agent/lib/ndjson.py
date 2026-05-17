"""NDJSON エンコーダ — StreamEvent → 改行終端の UTF-8 bytes。

FastAPI の StreamingResponse から bytes を yield するために使う。
TS 側 src/lib/agent/stream.ts の encodeNdjsonStream と互換。
"""

from __future__ import annotations

from collections.abc import AsyncIterable, AsyncIterator

from pydantic import BaseModel


def to_ndjson_line(event: BaseModel) -> bytes:
    """1 イベントを `${JSON}\\n` の UTF-8 bytes にエンコード。

    by_alias は使わず Pydantic デフォルト (field 名) で dump。
    """
    return (event.model_dump_json() + "\n").encode("utf-8")


async def encode_ndjson_stream(
    events: AsyncIterable[BaseModel],
) -> AsyncIterator[bytes]:
    """非同期イベント列を NDJSON bytes 列に変換する async generator。"""
    async for e in events:
        yield to_ndjson_line(e)
