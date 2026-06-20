"""DI: LLM / Imagen クライアントの取得 (実装 / Mock 実装の切替)。

設計判断:
- ADK の Runner を毎回 spin up すると重い。LlmClient プロトコルを噛ませて、
  テスト / オフライン開発では MockLlmClient で即値返却に切替可能にする。
- 実 Gemini 呼び出しは AdkLlmClient (T-232 で実装) が担当。
- settings.use_mock_llm = True または GOOGLE_CLOUD_PROJECT 未設定なら Mock。
- Slice 3 で ImagenClient を追加 (use_mock_image / 同条件で Mock 化)。
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Protocol, get_args, get_origin

from pydantic import BaseModel
from pydantic.fields import FieldInfo

from .agents.imagen_client import ImagenClient, MockImagenClient
from .furusato.cache import FurusatoCache, InMemoryFurusatoCache
from .lib.settings import Settings, get_settings
from .lib.storage import MockStorageClient, StorageClient


class SingletonManager[T]:
    """プロセス内シングルトンの取得・リセット・差し替えを一元化する小さなコンテナ。

    LLM / Imagen / Storage / Furusato で重複していた
    「module global + get_X(settings) + reset_X_for_testing + set_X_for_testing」
    の 3 点セットを共通化する。生成ロジック (Mock vs 実装の切替) は factory に閉じ込める。
    """

    def __init__(self, factory: Callable[[Settings], T]) -> None:
        self._instance: T | None = None
        self._factory = factory

    def get(self, settings: Settings | None = None) -> T:
        """未生成なら settings (省略時は get_settings()) で factory を呼んでキャッシュする。"""
        if self._instance is None:
            self._instance = self._factory(settings or get_settings())
        return self._instance

    def reset(self) -> None:
        """キャッシュを破棄する (テスト用)。"""
        self._instance = None

    def set(self, instance: T) -> None:
        """具体的なインスタンスを直接注入する (テスト用)。"""
        self._instance = instance


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


def _create_llm_client(s: Settings) -> LlmClient:
    """settings.use_mock_llm または ADC 未設定で Mock、それ以外は ADK。"""
    if s.use_mock_llm or not s.google_cloud_project:
        return MockLlmClient()
    # 遅延 import (ADK は重く、テスト時に常に import すると遅い)
    from .agents.adk_client import AdkLlmClient  # noqa: PLC0415

    return AdkLlmClient(project=s.google_cloud_project, location=s.vertex_ai_location)


_llm_manager: SingletonManager[LlmClient] = SingletonManager(_create_llm_client)


def get_llm_client(settings: Settings | None = None) -> LlmClient:
    """プロセス内シングルトン。settings.use_mock_llm または ADC 未設定で Mock。"""
    return _llm_manager.get(settings)


def reset_llm_client_for_testing() -> None:
    _llm_manager.reset()


def set_llm_client_for_testing(client: LlmClient) -> None:
    """テストから具体的な LlmClient を注入する (e.g. unittest.mock.AsyncMock)。"""
    _llm_manager.set(client)


# ----- Slice 3: Imagen クライアント ------------------------------------------


def _create_imagen_client(s: Settings) -> ImagenClient:
    """use_mock_image / LLM Mock / GOOGLE_CLOUD_PROJECT 未設定で Mock、それ以外は Vertex。"""
    if s.use_mock_image or s.use_mock_llm or not s.google_cloud_project:
        return MockImagenClient()
    from .agents.imagen_client import VertexImagenClient  # noqa: PLC0415

    return VertexImagenClient(project=s.google_cloud_project, location=s.vertex_ai_location)


_imagen_manager: SingletonManager[ImagenClient] = SingletonManager(_create_imagen_client)


def get_imagen_client(settings: Settings | None = None) -> ImagenClient:
    """プロセス内シングルトン。use_mock_image または GOOGLE_CLOUD_PROJECT 未設定で Mock。"""
    return _imagen_manager.get(settings)


def reset_imagen_client_for_testing() -> None:
    _imagen_manager.reset()


def set_imagen_client_for_testing(client: ImagenClient) -> None:
    """テストから具体的な ImagenClient を注入する。"""
    _imagen_manager.set(client)


# ----- Slice 4: Storage クライアント (Imagen 出力先) -------------------------


def _create_storage_client(s: Settings) -> StorageClient:
    """優先順位:

    - use_mock_storage=true → MockStorageClient
    - 同 LLM/Image が Mock → MockStorageClient (整合性のため一蓮托生)
    - GOOGLE_CLOUD_PROJECT 未設定 → MockStorageClient
    - それ以外 → FirebaseStorageClient (emulator_host があれば Emulator、無ければ本番 GCS)
    """
    if s.use_mock_storage or s.use_mock_llm or s.use_mock_image or not s.google_cloud_project:
        return MockStorageClient()
    from .lib.storage import FirebaseStorageClient  # noqa: PLC0415

    return FirebaseStorageClient(
        bucket_name=s.firebase_storage_bucket,
        emulator_host=s.firebase_storage_emulator_host or None,
    )


_storage_manager: SingletonManager[StorageClient] = SingletonManager(_create_storage_client)


def get_storage_client(settings: Settings | None = None) -> StorageClient:
    """プロセス内シングルトン。use_mock_storage または GOOGLE_CLOUD_PROJECT 未設定で Mock。"""
    return _storage_manager.get(settings)


def reset_storage_client_for_testing() -> None:
    _storage_manager.reset()


def set_storage_client_for_testing(client: StorageClient) -> None:
    """テストから具体的な StorageClient を注入する。"""
    _storage_manager.set(client)


# ----- Slice 5: Furusato cache (楽天ふるさと納税) -----------------------------


def _create_furusato_cache(s: Settings) -> FurusatoCache:
    """優先順位:

    - use_mock_furusato=True or furusato_integration=False → InMemoryFurusatoCache
    - GOOGLE_CLOUD_PROJECT 未設定 → InMemoryFurusatoCache (オフライン)
    - それ以外 → FirestoreFurusatoCache (Emulator host があれば事前 setenv が必要)
    """
    if s.use_mock_furusato or not s.furusato_integration or not s.google_cloud_project:
        return InMemoryFurusatoCache()
    from .furusato.cache import FirestoreFurusatoCache  # noqa: PLC0415

    return FirestoreFurusatoCache(project_id=s.google_cloud_project)


_furusato_manager: SingletonManager[FurusatoCache] = SingletonManager(_create_furusato_cache)


def get_furusato_cache(settings: Settings | None = None) -> FurusatoCache:
    """プロセス内シングルトン。use_mock_furusato 等で InMemory、それ以外は Firestore。"""
    return _furusato_manager.get(settings)


def reset_furusato_cache_for_testing() -> None:
    _furusato_manager.reset()


def set_furusato_cache_for_testing(cache: FurusatoCache) -> None:
    """テストから具体的な FurusatoCache を注入する。"""
    _furusato_manager.set(cache)
