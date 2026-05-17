"""lib/logging.py のテスト — TS 側 logger.test.ts と等価。"""

from __future__ import annotations

import io
import json

from makelocal_agent.lib.logging import StructuredLogger


def _make() -> tuple[StructuredLogger, io.StringIO, io.StringIO]:
    info_buf: io.StringIO = io.StringIO()
    err_buf: io.StringIO = io.StringIO()
    log = StructuredLogger(
        min_level="debug",
        base_context={"service": "mlpr-test"},
        stream_info=info_buf,
        stream_err=err_buf,
    )
    return log, info_buf, err_buf


def _last_record(buf: io.StringIO) -> dict[str, object]:
    lines = [line for line in buf.getvalue().splitlines() if line]
    return json.loads(lines[-1]) if lines else {}


class TestEmit:
    def test_writes_json_record_with_severity_message_timestamp_context(self) -> None:
        log, info_buf, _ = _make()
        log.info("hello", context={"userId": "u1"})
        rec = _last_record(info_buf)
        assert rec["severity"] == "INFO"
        assert rec["message"] == "hello"
        assert rec["service"] == "mlpr-test"
        assert rec["userId"] == "u1"
        assert isinstance(rec["timestamp"], str)

    def test_severity_mapping(self) -> None:
        log, info_buf, err_buf = _make()
        log.debug("d")
        log.info("i")
        log.warn("w")
        log.error("e")

        info_lines = [line for line in info_buf.getvalue().splitlines() if line]
        err_lines = [line for line in err_buf.getvalue().splitlines() if line]

        sevs_info = [json.loads(line)["severity"] for line in info_lines]
        sevs_err = [json.loads(line)["severity"] for line in err_lines]
        assert sevs_info == ["DEBUG", "INFO"]
        assert sevs_err == ["WARNING", "ERROR"]


class TestMinLevel:
    def test_drops_records_below_min(self) -> None:
        info_buf = io.StringIO()
        err_buf = io.StringIO()
        log = StructuredLogger(min_level="warn", stream_info=info_buf, stream_err=err_buf)
        log.debug("d")
        log.info("i")
        log.warn("w")
        log.error("e")
        assert info_buf.getvalue() == ""
        err_lines = [line for line in err_buf.getvalue().splitlines() if line]
        messages = [json.loads(line)["message"] for line in err_lines]
        assert messages == ["w", "e"]


class TestChild:
    def test_merges_extra_context(self) -> None:
        log, info_buf, _ = _make()
        child = log.child({"requestId": "req-1"})
        child.info("child-msg", context={"extra": 1})
        rec = _last_record(info_buf)
        assert rec["service"] == "mlpr-test"
        assert rec["requestId"] == "req-1"
        assert rec["extra"] == 1
        assert rec["message"] == "child-msg"

    def test_per_call_context_overrides_base_on_key_collision(self) -> None:
        log, info_buf, _ = _make()
        log.info("m", context={"service": "override"})
        rec = _last_record(info_buf)
        assert rec["service"] == "override"
