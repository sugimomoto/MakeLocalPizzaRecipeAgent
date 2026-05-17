"""agents/image_agent.py のテスト — プロンプト + data URI 変換。"""

from __future__ import annotations

import base64
from unittest.mock import AsyncMock

import pytest

from makelocal_agent.agents.image_agent import build_image_prompt, run_image_for_candidate
from makelocal_agent.agents.imagen_client import MockImagenClient


class TestBuildImagePrompt:
    def test_includes_title_and_ingredients_and_region(self) -> None:
        prompt = build_image_prompt(
            candidate_title="松島の牡蠣ピザ",
            key_ingredients=["牡蠣", "せり"],
            prefecture="宮城県",
        )
        assert "松島の牡蠣ピザ" in prompt
        assert "牡蠣" in prompt
        assert "せり" in prompt
        assert "宮城県" in prompt
        assert "pizza" in prompt.lower()

    def test_falls_back_when_no_ingredients(self) -> None:
        prompt = build_image_prompt(candidate_title="t", key_ingredients=[], prefecture="北海道")
        assert "regional ingredients" in prompt


class TestRunImageForCandidate:
    @pytest.mark.asyncio
    async def test_returns_data_uri_with_png_payload(self) -> None:
        client = MockImagenClient()
        uri = await run_image_for_candidate(
            client=client,
            candidate_title="t",
            key_ingredients=["牡蠣"],
            prefecture="宮城県",
        )
        assert uri.startswith("data:image/png;base64,")
        payload = uri.split(",", 1)[1]
        decoded = base64.b64decode(payload)
        assert decoded.startswith(b"\x89PNG\r\n\x1a\n")

    @pytest.mark.asyncio
    async def test_passes_model_and_prompt_to_client(self) -> None:
        spy = AsyncMock()
        spy.generate_image = AsyncMock(return_value=b"\x89PNG\r\n\x1a\nfake")
        await run_image_for_candidate(
            client=spy,
            candidate_title="松島の牡蠣ピザ",
            key_ingredients=["牡蠣"],
            prefecture="宮城県",
            model="imagen-4.0-generate-001",
        )
        kwargs = spy.generate_image.call_args.kwargs
        assert kwargs["model"] == "imagen-4.0-generate-001"
        assert "松島の牡蠣ピザ" in kwargs["prompt"]
