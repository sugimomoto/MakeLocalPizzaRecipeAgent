"""image_agent — 候補 1 件分の Imagen プロンプト構築と data URI 化。

- ImagenClient (Vertex / Mock) を呼び、PNG bytes → base64 data URI に変換
- 画像専用プロンプトは食材・地域・スタイルを盛り込む
"""

from __future__ import annotations

import base64

from ..lib.settings import get_settings
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
    candidate_title: str,
    key_ingredients: list[str],
    prefecture: str,
    model: str | None = None,
) -> str:
    """Imagen を 1 回呼んで data:image/png;base64,... 形式の URI を返す。"""
    effective_model = model or get_settings().imagen_model
    prompt = build_image_prompt(
        candidate_title=candidate_title,
        key_ingredients=key_ingredients,
        prefecture=prefecture,
    )
    png_bytes = await client.generate_image(model=effective_model, prompt=prompt)
    b64 = base64.b64encode(png_bytes).decode("ascii")
    return f"data:image/png;base64,{b64}"
