"""lib/settings.py のテスト。"""

from __future__ import annotations

import pytest

from makelocal_agent.lib.settings import Settings, get_settings, reset_settings_for_testing


@pytest.fixture(autouse=True)
def _reset() -> None:
    reset_settings_for_testing()


def test_defaults_when_no_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("MLPR_GEMINI_MODEL", raising=False)
    monkeypatch.delenv("MLPR_VERTEX_AI_LOCATION", raising=False)
    monkeypatch.delenv("MLPR_IMAGEN_MODEL", raising=False)
    monkeypatch.delenv("MLPR_USE_MOCK_IMAGE", raising=False)
    s = Settings()
    assert s.gemini_model == "gemini-2.5-flash"
    assert s.vertex_ai_location == "asia-northeast1"
    assert s.imagen_model == "imagen-4.0-generate-001"
    assert s.use_mock_llm is False
    assert s.use_mock_image is False
    assert s.max_timeout_sec == 60.0


def test_reads_env_with_mlpr_prefix(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MLPR_GEMINI_MODEL", "gemini-2.5-pro")
    monkeypatch.setenv("MLPR_GOOGLE_CLOUD_PROJECT", "my-proj")
    monkeypatch.setenv("MLPR_USE_MOCK_LLM", "true")
    s = Settings()
    assert s.gemini_model == "gemini-2.5-pro"
    assert s.google_cloud_project == "my-proj"
    assert s.use_mock_llm is True


def test_get_settings_returns_singleton() -> None:
    s1 = get_settings()
    s2 = get_settings()
    assert s1 is s2


def test_reset_clears_singleton(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MLPR_GEMINI_MODEL", "gemini-2.5-flash")
    s1 = get_settings()
    monkeypatch.setenv("MLPR_GEMINI_MODEL", "gemini-2.5-pro")
    reset_settings_for_testing()
    s2 = get_settings()
    assert s1 is not s2
    assert s2.gemini_model == "gemini-2.5-pro"
