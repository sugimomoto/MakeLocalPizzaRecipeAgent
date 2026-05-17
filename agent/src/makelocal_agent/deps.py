"""DI: LLM / Imagen クライアントの取得 (実装 / Mock 実装の切替)。

設計判断:
- ADK の Runner を毎回 spin up すると重い。LlmClient プロトコルを噛ませて、
  テスト / オフライン開発では MockLlmClient で即値返却に切替可能にする。
- 実 Gemini 呼び出しは AdkLlmClient (T-232 で実装) が担当。
- settings.use_mock_llm = True または GOOGLE_CLOUD_PROJECT 未設定なら Mock。
- Slice 3 で ImagenClient を追加 (use_mock_image / 同条件で Mock 化)。
"""

from __future__ import annotations

from typing import Protocol, get_args, get_origin

from pydantic import BaseModel
from pydantic.fields import FieldInfo

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


def _min_length_of(finfo: FieldInfo) -> int:
    """Pydantic FieldInfo から min_length 制約を取り出す。なければ 0。"""
    for meta in finfo.metadata or ():
        v = getattr(meta, "min_length", None)
        if isinstance(v, int):
            return v
    return 0


def _mock_value(ann: object, name: str, *, min_len: int = 0) -> object:
    """型注釈に応じてモック値を組み立てる (Slice 3 で再帰対応に拡張)。

    - str → f"mock-{name}"
    - list[str] → max(min_len, 2) 件の文字列
    - list[<BaseModel 派生>] → max(min_len, 3) 件のサブモデル
    - <BaseModel 派生> → 再帰的に各 field を埋める
    - その他 → None (呼び出し側に判断を委ねる)
    """
    if ann is str:
        return f"mock-{name}"

    origin = get_origin(ann)
    if origin is list:
        (inner,) = get_args(ann)
        count = max(min_len, 2)
        if isinstance(inner, type) and issubclass(inner, BaseModel):
            count = max(min_len, 3)
            return [_build_basemodel(inner) for _ in range(count)]
        if inner is str:
            return [f"mock-{name}-{i + 1}" for i in range(count)]

    if isinstance(ann, type) and issubclass(ann, BaseModel):
        return _build_basemodel(ann)

    return None


def _build_basemodel(model_cls: type[BaseModel]) -> BaseModel:
    """BaseModel の各 field を _mock_value で再帰的に埋めて instance を作る。"""
    kwargs: dict[str, object] = {}
    for fname, finfo in model_cls.model_fields.items():
        kwargs[fname] = _mock_value(finfo.annotation, fname, min_len=_min_length_of(finfo))
    return model_cls(**kwargs)


class MockLlmClient:
    """テスト・オフライン用ダミー。output_schema の field を機械的に埋める。

    Slice 1: str / list[str] の単純対応のみ。
    Slice 3: ネスト BaseModel と list[BaseModel] の再帰対応 + min_length 反映。
    """

    async def run_structured(
        self,
        *,
        model: str,
        instruction: str,
        prompt: str,
        output_schema: type[BaseModel],
    ) -> BaseModel:
        return _build_basemodel(output_schema)


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


# ----- Slice 3: Imagen クライアント ------------------------------------------

from .agents.imagen_client import ImagenClient, MockImagenClient  # noqa: E402

_imagen_singleton: ImagenClient | None = None


def get_imagen_client(settings: Settings | None = None) -> ImagenClient:
    """プロセス内シングルトン。use_mock_image または GOOGLE_CLOUD_PROJECT 未設定で Mock。"""
    global _imagen_singleton  # noqa: PLW0603  process-wide singleton
    if _imagen_singleton is not None:
        return _imagen_singleton
    s = settings or get_settings()
    if s.use_mock_image or s.use_mock_llm or not s.google_cloud_project:
        _imagen_singleton = MockImagenClient()
    else:
        from .agents.imagen_client import VertexImagenClient  # noqa: PLC0415

        _imagen_singleton = VertexImagenClient(
            project=s.google_cloud_project,
            location=s.vertex_ai_location,
        )
    return _imagen_singleton


def reset_imagen_client_for_testing() -> None:
    global _imagen_singleton  # noqa: PLW0603  process-wide singleton
    _imagen_singleton = None


def set_imagen_client_for_testing(client: ImagenClient) -> None:
    """テストから具体的な ImagenClient を注入する。"""
    global _imagen_singleton  # noqa: PLW0603  process-wide singleton
    _imagen_singleton = client
