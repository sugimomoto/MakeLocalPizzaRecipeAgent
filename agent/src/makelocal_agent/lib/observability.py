# mypy: warn-unused-ignores=False
"""OpenTelemetry + Cloud Trace 配線 (Slice 6)。

Cloud Run 上 (`K_SERVICE` が env に存在) でのみ実体を起動。
local / CI では no-op (Cloud Trace 課金しないため)。

ポイント:
- FastAPIInstrumentor: incoming `traceparent` を読み取り親 span を継続
  (Web 側 (Next.js OTel) から繋がる)
- HTTPXClientInstrumentor: 必要なら httpx で外部 API を叩く際に伝播
- TraceContextTextMapPropagator: W3C 標準。Cloud Trace の独自フォーマット
  (X-Cloud-Trace-Context) も使えるが、Web 側を W3C に揃えているので統一。
- CloudTraceSpanExporter: span を Cloud Trace にエクスポート

`google.cloud.*` 系の attribute 解決が CI / local で揺れるため
file-level で warn-unused-ignores=False。
"""

from __future__ import annotations

import os
from collections.abc import Iterator
from contextlib import contextmanager
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from fastapi import FastAPI

_initialized = False


def is_cloud_run() -> bool:
    """Cloud Run 環境かを判定。K_SERVICE は Cloud Run が自動付与する env。"""
    return bool(os.environ.get("K_SERVICE"))


def configure_observability(app: FastAPI) -> None:
    """OTel + Cloud Trace の初期化。Cloud Run 環境でだけ実体を起動する。

    冪等: 複数回呼ばれても 1 回だけ初期化。
    """
    global _initialized  # noqa: PLW0603  process-wide singleton
    if _initialized:
        return
    if not is_cloud_run():
        return

    # 重い import は本番でだけ。dev / test では evaluate されない。
    from opentelemetry import trace  # noqa: PLC0415
    from opentelemetry.exporter.cloud_trace import CloudTraceSpanExporter  # noqa: PLC0415
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor  # noqa: PLC0415
    from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor  # noqa: PLC0415
    from opentelemetry.sdk.resources import Resource  # noqa: PLC0415
    from opentelemetry.sdk.trace import TracerProvider  # noqa: PLC0415
    from opentelemetry.sdk.trace.export import BatchSpanProcessor  # noqa: PLC0415

    project_id = os.environ.get("MLPR_GOOGLE_CLOUD_PROJECT") or os.environ.get(
        "GOOGLE_CLOUD_PROJECT"
    )
    service_name = os.environ.get("K_SERVICE", "mlpr-agent")
    service_revision = os.environ.get("K_REVISION", "unknown")

    resource = Resource.create(
        {
            "service.name": service_name,
            "service.namespace": "mlpr",
            "service.version": service_revision,
        }
    )
    provider = TracerProvider(resource=resource)
    exporter_kwargs: dict[str, Any] = {}
    if project_id:
        exporter_kwargs["project_id"] = project_id
    # CloudTraceSpanExporter は py.typed 無く `Any` 扱いされる場合があるため、
    # mypy の no-untyped-call を file レベルで対応。
    provider.add_span_processor(
        BatchSpanProcessor(CloudTraceSpanExporter(**exporter_kwargs))  # type: ignore[no-untyped-call]
    )
    trace.set_tracer_provider(provider)

    # FastAPI の incoming request に対し span を作成し、traceparent を継承
    FastAPIInstrumentor.instrument_app(app)
    # httpx を使う outgoing 通信に traceparent を伝播 (Slice 6 ではほぼ使わないが念のため)
    HTTPXClientInstrumentor().instrument()

    _initialized = True


def get_current_trace_id() -> str | None:
    """現在の span の trace_id を 32桁 hex で返す。span が無ければ None。

    StructuredLogger に注入して Cloud Logging の log entry に trace を
    関連付けるために使う。
    """
    if not _initialized:
        return None
    try:
        from opentelemetry import trace  # noqa: PLC0415

        span = trace.get_current_span()
        ctx = span.get_span_context()
        if not ctx or not ctx.is_valid:
            return None
        return format(ctx.trace_id, "032x")
    except Exception:  # pragma: no cover  防御的
        return None


@contextmanager
def reset_for_testing() -> Iterator[None]:
    """テスト用に初期化フラグをリセットする。"""
    global _initialized  # noqa: PLW0603  test helper
    prev = _initialized
    _initialized = False
    try:
        yield
    finally:
        _initialized = prev
