"""構造化ロガー — TS 側 src/lib/observability/logger.ts と shape を合わせる。

- JSON 1 行 / 1 ログ (severity / message / timestamp / 任意 context)
- severity は Cloud Logging 用 (DEBUG/INFO/WARNING/ERROR)
- get_logger() でモジュール内シングルトンを取得
- Slice 6: OTel 配線済 (Cloud Run 上) では trace_id を inject し、
  Cloud Logging から該当 trace に飛べるようにする
"""

from __future__ import annotations

import json
import logging
import os
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
        # Slice 6: Cloud Run 上で OTel が動いている場合のみ trace を注入。
        # logging_v2_LogEntry の `trace` フィールドに合わせ
        # `projects/<project-id>/traces/<TRACE_ID>` 形式で書くと Cloud Logging
        # と Cloud Trace の relation が見える化される。
        trace_id = _get_current_trace_id()
        if trace_id is not None:
            project_id = _get_gcp_project_id()
            if project_id:
                record["logging.googleapis.com/trace"] = f"projects/{project_id}/traces/{trace_id}"
            else:
                record["trace_id"] = trace_id
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


def _get_current_trace_id() -> str | None:
    """OTel 配線済なら現在 span の trace_id を返す。循環 import 防止のため lazy。"""
    try:
        from .observability import get_current_trace_id  # noqa: PLC0415

        return get_current_trace_id()
    except Exception:  # pragma: no cover
        return None


def _get_gcp_project_id() -> str | None:
    """Cloud Run 起動時の env から GCP プロジェクト ID を取得 (Cloud Logging の trace link 用)。"""
    return os.environ.get("MLPR_GOOGLE_CLOUD_PROJECT") or os.environ.get("GOOGLE_CLOUD_PROJECT")


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
