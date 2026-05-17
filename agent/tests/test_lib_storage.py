"""lib/storage.py のテスト — MockStorageClient の基本動作。"""

from __future__ import annotations

from makelocal_agent.lib.storage import MockStorageClient, StorageClient


class TestMockStorageClient:
    def test_returns_deterministic_url(self) -> None:
        client = MockStorageClient()
        url = client.upload_image("c_test", b"\x89PNG\r\n\x1a\nfake")
        assert url == "https://mock-storage.local/recipes/c_test.png"

    def test_custom_base_url(self) -> None:
        client = MockStorageClient(base_url="http://localhost:9199")
        url = client.upload_image("c_x", b"data")
        assert url.startswith("http://localhost:9199/")

    def test_remembers_calls_for_assertion(self) -> None:
        client = MockStorageClient()
        client.upload_image("c_a", b"first")
        client.upload_image("c_b", b"second")
        assert client.calls == {"c_a": b"first", "c_b": b"second"}

    def test_satisfies_protocol(self) -> None:
        # 型レベルで Protocol を満たすことの確認
        c: StorageClient = MockStorageClient()
        assert hasattr(c, "upload_image")
