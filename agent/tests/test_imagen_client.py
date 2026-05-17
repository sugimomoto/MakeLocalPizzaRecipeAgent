"""agents/imagen_client.py のテスト — Protocol / Mock 挙動。"""

from __future__ import annotations

import pytest

from makelocal_agent.agents.imagen_client import (
    ImagenClient,
    MockImagenClient,
    VertexImagenClient,
)

_PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


class TestMockImagenClient:
    @pytest.mark.asyncio
    async def test_returns_valid_png_bytes(self) -> None:
        client = MockImagenClient()
        b = await client.generate_image(model="any", prompt="anything")
        assert b.startswith(_PNG_SIGNATURE)
        assert len(b) > len(_PNG_SIGNATURE)


class TestImagenClientProtocol:
    """Mock / Vertex 共通 interface の satisfies チェック (型レベル)。"""

    def test_mock_satisfies_protocol(self) -> None:
        client: ImagenClient = MockImagenClient()
        assert hasattr(client, "generate_image")

    def test_vertex_satisfies_protocol(self) -> None:
        # 実呼び出しはしない (init のみ)。env を汚さないよう ADC モードは default に任せる
        client: ImagenClient = VertexImagenClient(project="dummy", location="asia-northeast1")
        assert hasattr(client, "generate_image")
