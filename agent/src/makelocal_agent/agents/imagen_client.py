"""ImagenClient — Vertex AI Imagen 4 を呼ぶ抽象。

- Protocol (ImagenClient) を介して呼び出し側を実装非依存にする
- VertexImagenClient: 本物 (google-genai SDK で Vertex モード)
- MockImagenClient: テスト用、1x1 PNG bytes を固定で返す

PNG bytes は呼び出し側 (image_agent) で base64 data URI に変換する。
"""

from __future__ import annotations

import os
from typing import Protocol


class ImagenClient(Protocol):
    """1 枚 PNG bytes を返す Imagen API 抽象。"""

    async def generate_image(
        self,
        *,
        model: str,
        prompt: str,
        aspect_ratio: str = "1:1",
    ) -> bytes: ...


# 1x1 透明 PNG。テストやオフライン dev での placeholder として使う。
_PNG_1X1_TRANSPARENT: bytes = (
    b"\x89PNG\r\n\x1a\n"
    b"\x00\x00\x00\rIHDR"
    b"\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
    b"\x00\x00\x00\rIDAT"
    b"\x78\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4"
    b"\x00\x00\x00\x00IEND\xaeB`\x82"
)


class MockImagenClient:
    """テスト・オフライン用ダミー。1x1 透明 PNG を即座に返す。"""

    async def generate_image(
        self,
        *,
        model: str,
        prompt: str,
        aspect_ratio: str = "1:1",
    ) -> bytes:
        return _PNG_1X1_TRANSPARENT


class VertexImagenClient:
    """Vertex AI Imagen 4 を呼ぶ実装 (本物)。

    AdkLlmClient と同様、google-genai SDK を Vertex モードに切替える環境変数を
    既存値を尊重しつつ未設定なら設定する。
    """

    def __init__(self, *, project: str, location: str) -> None:
        self.project = project
        self.location = location
        os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "true")
        os.environ.setdefault("GOOGLE_CLOUD_PROJECT", project)
        os.environ.setdefault("GOOGLE_CLOUD_LOCATION", location)

    async def generate_image(
        self,
        *,
        model: str,
        prompt: str,
        aspect_ratio: str = "1:1",
    ) -> bytes:
        # 遅延 import (SDK は重い)
        from google import genai  # noqa: PLC0415
        from google.genai.types import GenerateImagesConfig  # noqa: PLC0415

        client = genai.Client(vertexai=True, project=self.project, location=self.location)
        resp = await client.aio.models.generate_images(
            model=model,
            prompt=prompt,
            config=GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio=aspect_ratio,
                output_mime_type="image/png",
            ),
        )
        if not resp.generated_images:
            msg = "Imagen returned no generated_images"
            raise RuntimeError(msg)
        first = resp.generated_images[0]
        if first.image is None or first.image.image_bytes is None:
            msg = "Imagen GeneratedImage missing image_bytes"
            raise RuntimeError(msg)
        return first.image.image_bytes
