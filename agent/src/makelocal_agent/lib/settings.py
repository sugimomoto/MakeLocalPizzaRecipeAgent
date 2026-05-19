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

    # Slice 5: 楽天ふるさと納税連動の on/off (既定 off で safe rollout)
    furusato_integration: bool = False
    # True で InMemoryFurusatoCache + dummy items (オフライン開発 / CI)
    use_mock_furusato: bool = False
    # Firestore Emulator 経由で書き込む場合のホスト (例: "localhost:8081")。
    # 空なら本番 Firestore に向ける。Slice 5 では refresh script から使う。
    firestore_emulator_host: str = ""

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


# ----- Slice 5: 楽天 API クレデンシャル ---------------------------------------
# 楽天 Web Service のキーは MLPR_* prefix を持たないため別 Settings として定義。


class RakutenSettings(BaseSettings):
    """楽天 Web Service の認証情報。

    env 変数 (prefix なし):
      - RAKUTEN_APPLICATION_ID: UUID 形式の Application ID
      - RAKUTEN_ACCESS_KEY:     新エンドポイント必須の accessKey (pk_*)
      - RAKUTEN_AFFILIATE_ID:   任意。指定すると affiliateUrl が付く
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        frozen=True,
    )

    rakuten_application_id: str = ""
    rakuten_access_key: str = ""
    rakuten_affiliate_id: str = ""


_rakuten_singleton: RakutenSettings | None = None


def get_rakuten_settings() -> RakutenSettings:
    """プロセス内シングルトンとして RakutenSettings を取得する。"""
    global _rakuten_singleton  # noqa: PLW0603  process-wide singleton
    if _rakuten_singleton is None:
        _rakuten_singleton = RakutenSettings()
    return _rakuten_singleton


def reset_rakuten_settings_for_testing() -> None:
    global _rakuten_singleton  # noqa: PLW0603  process-wide singleton
    _rakuten_singleton = None
