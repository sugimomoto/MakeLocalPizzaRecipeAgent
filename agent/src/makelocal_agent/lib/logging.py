"""構造化ロガー — TS 側 src/lib/observability/logger.ts と shape を合わせる。

- JSON 1 行 / 1 ログ (severity / message / timestamp / 任意 context)
- severity は Cloud Logging 用 (DEBUG/INFO/WARNING/ERROR)
- get_logger() でモジュール内シングルトンを取得
"""

from __future__ import annotations

import json
import logging
import sys
from datetime import UTC, datetime
from typing import Any, Literal

LogLevel = Literal["debug", "info", "warn", "error"]

_SEVERITY: dict[LogLevel, str] = {
    "debug": "DEBUG",
    "info": "INFO",
    "warn": "WARNING",
    "error": "ERROR",
}

_PRIORITY: dict[LogLevel, int] = {
    "debug": 10,
    "info": 20,
    "warn": 30,
    "error": 40,
}


class StructuredLogger:
    """JSON 行を stdout/stderr に書く構造化ロガー。

    Cloud Logging が JSON フィールドをパースして severity / labels を抽出する
    フォーマットに準拠 (https://cloud.google.com/logging/docs/structured-logging)。
    """

    def __init__(
        self,
        *,
        min_level: LogLevel = "info",
        base_context: dict[str, Any] | None = None,
        stream_info: Any = None,
        stream_err: Any = None,
    ) -> None:
        self._min_priority = _PRIORITY[min_level]
        self._base_context = dict(base_context or {})
        self._stream_info = stream_info or sys.stdout
        self._stream_err = stream_err or sys.stderr

    def _emit(self, level: LogLevel, message: str, context: dict[str, Any] | None) -> None:
        if _PRIORITY[level] < self._min_priority:
            return
        record: dict[str, Any] = {
            "severity": _SEVERITY[level],
            "message": message,
            "timestamp": datetime.now(UTC).isoformat(),
            **self._base_context,
            **(context or {}),
        }
        line = json.dumps(record, ensure_ascii=False)
        stream = self._stream_err if level in ("warn", "error") else self._stream_info
        print(line, file=stream, flush=True)

    def debug(self, message: str, *, context: dict[str, Any] | None = None) -> None:
        self._emit("debug", message, context)

    def info(self, message: str, *, context: dict[str, Any] | None = None) -> None:
        self._emit("info", message, context)

    def warn(self, message: str, *, context: dict[str, Any] | None = None) -> None:
        self._emit("warn", message, context)

    def error(self, message: str, *, context: dict[str, Any] | None = None) -> None:
        self._emit("error", message, context)

    def child(self, extra: dict[str, Any]) -> StructuredLogger:
        return StructuredLogger(
            min_level=_level_for_priority(self._min_priority),
            base_context={**self._base_context, **extra},
            stream_info=self._stream_info,
            stream_err=self._stream_err,
        )


def _level_for_priority(priority: int) -> LogLevel:
    for lvl, p in _PRIORITY.items():
        if p == priority:
            return lvl
    return "info"


_singleton: StructuredLogger | None = None


def get_logger() -> StructuredLogger:
    """プロセス内シングルトンとして StructuredLogger を取得する。"""
    global _singleton  # noqa: PLW0603  process-wide singleton
    if _singleton is None:
        # 標準 logging への警告抑止 (uvicorn 互換)
        logging.captureWarnings(True)
        _singleton = StructuredLogger(base_context={"service": "mlpr-agent"})
    return _singleton


def reset_logger_for_testing() -> None:
    global _singleton  # noqa: PLW0603  process-wide singleton
    _singleton = None
