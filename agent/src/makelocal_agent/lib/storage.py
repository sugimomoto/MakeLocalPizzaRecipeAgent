"""画像オブジェクトストレージ抽象 (Slice 4)。

- `StorageClient` Protocol で実装を差替可能に
- `MockStorageClient`: CI / オフライン dev 向け。決定論的な URL を返す
- `FirebaseStorageClient`: Emulator + 本番 GCS の両対応 (T-407 で追加)

設計判断:
- key は recipe_id (= candidate_id) を渡す前提。バケット内で
  `recipes/{key}.png` にぶら下げる
- PNG のみを扱う (Slice 4)。将来 WebP / JPEG 対応する場合は content_type
  引数を追加する
"""

from __future__ import annotations

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
