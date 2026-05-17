"""FastAPI route 統合テスト (TestClient + MockLlmClient)。"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from makelocal_agent.deps import (
    MockLlmClient,
    reset_llm_client_for_testing,
    set_llm_client_for_testing,
)
from makelocal_agent.lib.settings import reset_settings_for_testing
from makelocal_agent.main import app
from makelocal_agent.routes.candidates import _reset_repo_for_testing

PROJECT_ROOT = Path(__file__).resolve().parents[1]
REAL_YAML = PROJECT_ROOT / "data" / "ingredients.yaml"


@pytest.fixture(autouse=True)
def _setup(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MLPR_INGREDIENTS_YAML_PATH", str(REAL_YAML))
    reset_settings_for_testing()
    reset_llm_client_for_testing()
    set_llm_client_for_testing(MockLlmClient())
    _reset_repo_for_testing()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


class TestHealth:
    def test_returns_200_with_ok_true(self, client: TestClient) -> None:
        res = client.get("/agent/health")
        assert res.status_code == 200
        assert res.json() == {"ok": True}


class TestGenerateCandidates:
    def test_returns_200_ndjson_with_session_id_header(self, client: TestClient) -> None:
        res = client.post(
            "/agent/generate-candidates",
            json={
                "sessionId": "sess_test_1",
                "localeId": "miyagi",
                "ingredients": ["miyagi-seri", "miyagi-oyster"],
            },
        )
        assert res.status_code == 200
        assert "application/x-ndjson" in res.headers["content-type"]
        assert res.headers["x-mlpr-session-id"] == "sess_test_1"

    def test_streams_23_ndjson_lines(self, client: TestClient) -> None:
        res = client.post(
            "/agent/generate-candidates",
            json={
                "sessionId": "sess_test_2",
                "localeId": "miyagi",
                "ingredients": ["miyagi-seri"],
            },
        )
        lines = [line for line in res.text.splitlines() if line]
        assert len(lines) == 23
        # 各行は単独で valid JSON
        for line in lines:
            json.loads(line)
        # 先頭 session.start、末尾 session.done
        assert json.loads(lines[0])["type"] == "session.start"
        assert json.loads(lines[-1])["type"] == "session.done"

    def test_returns_404_for_unknown_locale(self, client: TestClient) -> None:
        res = client.post(
            "/agent/generate-candidates",
            json={
                "sessionId": "sess_test_3",
                "localeId": "atlantis",
                "ingredients": ["x"],
            },
        )
        assert res.status_code == 404
        body = res.json()
        assert body["detail"]["error"]["code"] == "LOCALE_NOT_FOUND"

    def test_returns_400_for_unknown_ingredient(self, client: TestClient) -> None:
        res = client.post(
            "/agent/generate-candidates",
            json={
                "sessionId": "sess_test_4",
                "localeId": "miyagi",
                "ingredients": ["does-not-exist"],
            },
        )
        assert res.status_code == 400
        body = res.json()
        assert body["detail"]["error"]["code"] == "INGREDIENT_NOT_FOUND"

    def test_returns_422_for_missing_required_field(self, client: TestClient) -> None:
        res = client.post(
            "/agent/generate-candidates",
            json={"localeId": "miyagi", "ingredients": ["miyagi-seri"]},
        )
        assert res.status_code == 422

    def test_returns_422_for_empty_ingredients(self, client: TestClient) -> None:
        res = client.post(
            "/agent/generate-candidates",
            json={
                "sessionId": "sess_test_5",
                "localeId": "miyagi",
                "ingredients": [],
            },
        )
        assert res.status_code == 422


class TestReroll:
    def test_returns_200_ndjson_with_source_and_new_session_headers(
        self, client: TestClient
    ) -> None:
        res = client.post(
            "/agent/reroll",
            json={
                "sourceSessionId": "sess_orig",
                "sessionId": "sess_new",
                "localeId": "miyagi",
                "ingredients": ["miyagi-seri"],
            },
        )
        assert res.status_code == 200
        assert "application/x-ndjson" in res.headers["content-type"]
        assert res.headers["x-mlpr-source-session-id"] == "sess_orig"
        assert res.headers["x-mlpr-session-id"] == "sess_new"

    def test_streams_23_lines(self, client: TestClient) -> None:
        res = client.post(
            "/agent/reroll",
            json={
                "sourceSessionId": "sess_orig",
                "sessionId": "sess_new",
                "localeId": "miyagi",
                "ingredients": ["miyagi-seri"],
            },
        )
        lines = [line for line in res.text.splitlines() if line]
        assert len(lines) == 23


class TestRoot:
    def test_root_returns_service_info(self, client: TestClient) -> None:
        res = client.get("/")
        assert res.status_code == 200
        assert res.json() == {"service": "makelocal-agent", "status": "ok"}
