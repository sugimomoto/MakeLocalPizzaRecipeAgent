"""POST /agent/recipes/{id} の統合テスト (Slice 3)。"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from makelocal_agent.agents.imagen_client import MockImagenClient
from makelocal_agent.deps import (
    MockLlmClient,
    reset_imagen_client_for_testing,
    reset_llm_client_for_testing,
    set_imagen_client_for_testing,
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
    reset_imagen_client_for_testing()
    set_llm_client_for_testing(MockLlmClient())
    set_imagen_client_for_testing(MockImagenClient())
    _reset_repo_for_testing()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def _valid_body() -> dict[str, object]:
    return {
        "localeId": "miyagi",
        "ingredients": ["miyagi-seri", "miyagi-oyster"],
        "candidate": {
            "candidateId": "c_1_abcxyz",
            "strategy": "exploit",
            "title": "松島の牡蠣ピザ",
            "concept": "海の旨味を素直に",
            "keyIngredients": ["牡蠣", "せり"],
            "sceneTags": ["週末家族"],
            "why": "王道の組合せ",
        },
    }


class TestGenerateRecipe:
    def test_returns_200_ndjson_with_recipe_id_header(self, client: TestClient) -> None:
        res = client.post("/agent/recipes/c_1_abcxyz", json=_valid_body())
        assert res.status_code == 200
        assert "application/x-ndjson" in res.headers["content-type"]
        assert res.headers["x-mlpr-recipe-id"] == "c_1_abcxyz"

    def test_streams_9_ndjson_lines_in_happy_path(self, client: TestClient) -> None:
        res = client.post("/agent/recipes/c_test", json=_valid_body())
        lines = [line for line in res.text.splitlines() if line]
        # 2 (start) + 6 (recipe) + 1 (image) = 9
        assert len(lines) == 9
        for line in lines:
            json.loads(line)

        types = [json.loads(line)["type"] for line in lines]
        assert "recipe.start" in types
        assert "image.start" in types
        assert "recipe.done" in types
        assert "image.ready" in types

    def test_first_two_events_are_start_pair(self, client: TestClient) -> None:
        res = client.post("/agent/recipes/c_test_2", json=_valid_body())
        lines = [line for line in res.text.splitlines() if line]
        first = json.loads(lines[0])
        second = json.loads(lines[1])
        assert {first["type"], second["type"]} == {"recipe.start", "image.start"}

    def test_returns_404_for_unknown_locale(self, client: TestClient) -> None:
        body = _valid_body()
        body["localeId"] = "atlantis"
        res = client.post("/agent/recipes/c_test_3", json=body)
        assert res.status_code == 404
        assert res.json()["detail"]["error"]["code"] == "LOCALE_NOT_FOUND"

    def test_returns_400_for_unknown_ingredient(self, client: TestClient) -> None:
        body = _valid_body()
        body["ingredients"] = ["does-not-exist"]
        res = client.post("/agent/recipes/c_test_4", json=body)
        assert res.status_code == 400
        assert res.json()["detail"]["error"]["code"] == "INGREDIENT_NOT_FOUND"

    def test_returns_422_for_missing_candidate(self, client: TestClient) -> None:
        body = _valid_body()
        del body["candidate"]
        res = client.post("/agent/recipes/c_test_5", json=body)
        assert res.status_code == 422

    def test_returns_422_for_empty_ingredients(self, client: TestClient) -> None:
        body = _valid_body()
        body["ingredients"] = []
        res = client.post("/agent/recipes/c_test_6", json=body)
        assert res.status_code == 422
