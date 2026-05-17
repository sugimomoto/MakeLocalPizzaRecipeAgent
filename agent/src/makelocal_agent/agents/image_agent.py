"""image_agent — 候補 1 件分の Imagen プロンプト構築 + Storage put。

- ImagenClient (Vertex / Mock) を呼んで PNG bytes を得る
- 得た PNG bytes を StorageClient (Firebase Storage / Mock) に put し URL を返す
- 画像専用プロンプトは食材・地域・スタイルを盛り込む

Slice 3 までは base64 data URI を NDJSON 1 行に乗せていたが (~5MB/行)、
Slice 4 で GCS URL に切替 (~数百 B/行)。
"""

from __future__ import annotations

from ..lib.settings import get_settings
from ..lib.storage import StorageClient
from .imagen_client import ImagenClient


def build_image_prompt(*, candidate_title: str, key_ingredients: list[str], prefecture: str) -> str:
    """Imagen 4 への画像生成プロンプト (英語) を組み立てる。

    Imagen は英語プロンプトの方が安定して食材の描写を再現しやすい。
    """
    visible = ", ".join(key_ingredients) if key_ingredients else "regional ingredients"
    return (
        "Top-down photograph of an artisanal Japanese-style pizza on a wooden board. "
        f'Title concept: "{candidate_title}". '
        f"Ingredients visible: {visible}. "
        "Style: clean composition, natural light, washi paper background hint, "
        "warm tones, food-photography quality, no text overlay. "
        f"Region inspiration: {prefecture}, Japan."
    )


async def run_image_for_candidate(
    *,
    client: ImagenClient,
    storage: StorageClient,
    candidate_id: str,
    candidate_title: str,
    key_ingredients: list[str],
    prefecture: str,
    model: str | None = None,
) -> str:
    """Imagen を 1 回呼んで PNG を Storage に put し、URL を返す。"""
    effective_model = model or get_settings().imagen_model
    prompt = build_image_prompt(
        candidate_title=candidate_title,
        key_ingredients=key_ingredients,
        prefecture=prefecture,
    )
    png_bytes = await client.generate_image(model=effective_model, prompt=prompt)
    # StorageClient.upload_image は同期実装 (google-cloud-storage SDK が同期)
    # asyncio コンテキスト内だが put 時間は数百 ms 程度なのでブロックしてよい
    return storage.upload_image(candidate_id, png_bytes)
