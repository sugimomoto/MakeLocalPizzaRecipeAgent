"""agents/image_agent.py のテスト — プロンプト + GCS put → URL。"""

from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from makelocal_agent.agents.image_agent import build_image_prompt, run_image_for_candidate
from makelocal_agent.agents.imagen_client import MockImagenClient
from makelocal_agent.lib.storage import MockStorageClient


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
    async def test_returns_storage_url(self) -> None:
        imagen = MockImagenClient()
        storage = MockStorageClient()
        url = await run_image_for_candidate(
            client=imagen,
            storage=storage,
            candidate_id="c_test",
            candidate_title="t",
            key_ingredients=["牡蠣"],
            prefecture="宮城県",
        )
        # MockStorageClient は決定論的 URL を返す
        assert url == "https://mock-storage.local/recipes/c_test.png"
        # 実際に PNG bytes が put されたことを履歴で検証
        assert "c_test" in storage.calls
        assert storage.calls["c_test"].startswith(b"\x89PNG\r\n\x1a\n")

    @pytest.mark.asyncio
    async def test_passes_model_and_prompt_to_imagen(self) -> None:
        imagen_spy = AsyncMock()
        imagen_spy.generate_image = AsyncMock(return_value=b"\x89PNG\r\n\x1a\nfake")
        storage = MockStorageClient()
        await run_image_for_candidate(
            client=imagen_spy,
            storage=storage,
            candidate_id="c_x",
            candidate_title="松島の牡蠣ピザ",
            key_ingredients=["牡蠣"],
            prefecture="宮城県",
            model="imagen-4.0-generate-001",
        )
        kwargs = imagen_spy.generate_image.call_args.kwargs
        assert kwargs["model"] == "imagen-4.0-generate-001"
        assert "松島の牡蠣ピザ" in kwargs["prompt"]
