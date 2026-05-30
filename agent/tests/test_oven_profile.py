"""oven_profile ドメインの型・directive テスト (Slice 8)。"""

from __future__ import annotations

from makelocal_agent.domain.oven_profile import (
    DEFAULT_OVEN_PROFILE_ID,
    ENRO_PROFILE,
    HOME_OVEN_PROFILE,
    OVEN_PROFILES,
    resolve_oven_profile,
)


def test_default_is_enro() -> None:
    assert DEFAULT_OVEN_PROFILE_ID == "enro_450c_90s"


def test_two_profiles_registered() -> None:
    assert set(OVEN_PROFILES.keys()) == {"enro_450c_90s", "home_oven_280c_10m"}


def test_enro_directive_mentions_high_heat() -> None:
    d = ENRO_PROFILE.prompt_directive
    assert "400" in d
    assert "450" in d
    assert "90" in d
    assert "120" in d
    assert "bakingTemp" in d


def test_home_oven_directive_mentions_low_heat() -> None:
    d = HOME_OVEN_PROFILE.prompt_directive
    assert "250" in d
    assert "300" in d
    assert "8" in d
    assert "15" in d
    assert "bakingTemp" in d


def test_resolve_with_known_id() -> None:
    assert resolve_oven_profile("enro_450c_90s").jp_label == "ENRO 電気ピザ窯"
    assert resolve_oven_profile("home_oven_280c_10m").jp_label == "家庭用オーブン"


def test_resolve_with_none_returns_default() -> None:
    assert resolve_oven_profile(None) is ENRO_PROFILE


def test_resolve_with_unknown_returns_default() -> None:
    assert resolve_oven_profile("gas_burner_500c") is ENRO_PROFILE


def test_resolve_with_empty_string_returns_default() -> None:
    assert resolve_oven_profile("") is ENRO_PROFILE
