"""画像オブジェクトストレージ抽象 (Slice 4)。

- `StorageClient` Protocol で実装を差替可能に
- `MockStorageClient`: CI / オフライン dev 向け。決定論的な URL を返す
- `FirebaseStorageClient`: Firebase Storage Emulator + 本番 GCS の両対応

設計判断:
- key は recipe_id (= candidate_id) を渡す前提。バケット内で
  `recipes/{key}.png` にぶら下げる
- PNG のみを扱う (Slice 4)。将来 WebP / JPEG 対応する場合は content_type
  引数を追加する
"""

from __future__ import annotations

import os
from typing import Protocol


class StorageClient(Protocol):
    """1 PNG を put して取得 URL を返す抽象。"""

    def upload_image(self, key: str, png_bytes: bytes) -> str: ...


class MockStorageClient:
    """テスト・オフライン dev 用ダミー。

    Slice 4 Emulator も含めずローカルだけで完結したいケース (CI 単体テストや
    オフライン dev) で使う。決定論的な URL を返すだけで、実際には何も保存しない。
    """

    def __init__(self, *, base_url: str = "https://mock-storage.local") -> None:
        self.base_url = base_url
        # put した key → png_bytes を覚えておく (テストから検証可能に)
        self.calls: dict[str, bytes] = {}

    def upload_image(self, key: str, png_bytes: bytes) -> str:
        self.calls[key] = png_bytes
        return f"{self.base_url}/recipes/{key}.png"


class FirebaseStorageClient:
    """Firebase Storage (Emulator + 本番 GCS) に PNG を put する実装。

    google-cloud-storage SDK を利用し、`emulator_host` が指定されている場合は
    環境変数 `STORAGE_EMULATOR_HOST` を立てて GCS クライアントを Emulator に
    向ける。

    本番運用時 (emulator_host=None):
    - bucket は事前作成済の前提
    - upload 後に `make_public()` で公開 (Slice 6 で署名付き URL に切替検討)
    """

    def __init__(self, *, bucket_name: str, emulator_host: str | None = None) -> None:
        self.bucket_name = bucket_name
        self.emulator_host = emulator_host
        if emulator_host:
            # google-cloud-storage は STORAGE_EMULATOR_HOST を見て接続先を切替
            os.environ.setdefault("STORAGE_EMULATOR_HOST", f"http://{emulator_host}")
        # SDK は重いので必要時のみ import (google-cloud-storage は py.typed 未提供)
        from google.cloud import storage  # type: ignore[import-untyped,attr-defined]  # noqa: PLC0415,I001

        self._client = storage.Client()

    def upload_image(self, key: str, png_bytes: bytes) -> str:
        bucket = self._client.bucket(self.bucket_name)
        blob = bucket.blob(f"recipes/{key}.png")
        blob.upload_from_string(png_bytes, content_type="image/png")
        if self.emulator_host:
            # Emulator は public URL を blob.public_url で返してくれない場合があるので明示構築
            return (
                f"http://{self.emulator_host}/v0/b/{self.bucket_name}"
                f"/o/recipes%2F{key}.png?alt=media"
            )
        blob.make_public()
        url: str = blob.public_url
        return url
