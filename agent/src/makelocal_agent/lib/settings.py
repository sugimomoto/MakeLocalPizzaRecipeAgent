"""アプリケーション設定 (環境変数 → Pydantic Settings)。

- GOOGLE_CLOUD_PROJECT: Vertex AI プロジェクト ID
- VERTEX_AI_LOCATION: リージョン (default: asia-northeast1)
- GEMINI_MODEL: モデル名 (default: gemini-2.5-flash)
- AGENT_DELAY_MIN_MS / MAX_MS: Mock 風の擬似遅延 (テスト時 0 にする)
- MAX_TIMEOUT_SEC: Gemini 呼び出し全体のタイムアウト
- USE_MOCK_LLM: True で LLM 呼び出しを擬似応答に置換 (CI / オフライン開発)
"""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="MLPR_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        frozen=True,
    )

    google_cloud_project: str = ""
    vertex_ai_location: str = "asia-northeast1"
    gemini_model: str = "gemini-2.5-flash"
    imagen_model: str = "imagen-4.0-generate-001"

    max_timeout_sec: float = 60.0
    use_mock_llm: bool = False
    use_mock_image: bool = False

    # Slice 4: Firebase Storage 設定 (Imagen の PNG 出力先)
    use_mock_storage: bool = False
    firebase_storage_bucket: str = "mlpr-local.appspot.com"
    # 空文字なら本番 GCS、値があれば Emulator (例: "localhost:9199")
    firebase_storage_emulator_host: str = ""

    # データファイルの相対パス (agent/ 起動時の cwd 基準)
    ingredients_yaml_path: str = "data/ingredients.yaml"


_singleton: Settings | None = None


def get_settings() -> Settings:
    """プロセス内シングルトンとして Settings を取得する (Vertex 接続情報のキャッシュ)。"""
    global _singleton  # noqa: PLW0603  process-wide singleton
    if _singleton is None:
        _singleton = Settings()
    return _singleton


def reset_settings_for_testing() -> None:
    """テスト用にシングルトンをクリアする。テストごとの env 変更を反映可能に。"""
    global _singleton  # noqa: PLW0603  process-wide singleton
    _singleton = None
