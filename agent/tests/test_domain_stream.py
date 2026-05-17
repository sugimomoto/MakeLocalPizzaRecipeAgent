"""src/domain/stream.py のテスト — TS 側 schemas.test.ts と等価。"""

from __future__ import annotations

import json
from typing import Any

import pytest
from pydantic import ValidationError

from makelocal_agent.domain.stream import (
    CandidateDoneEvent,
    CandidateStartEvent,
    ImageErrorEvent,
    ImageReadyEvent,
    ImageStartEvent,
    RecipeStepsEvent,
    RecipeStoryEvent,
    RecipeTitleEvent,
    SessionDoneEvent,
    SessionStartEvent,
    parse_stream_event,
)


class TestStreamEventPositive:
    def test_parses_session_start_with_full_strategies(self) -> None:
        e = SessionStartEvent(
            sessionId="sess_xxx",
            strategies=["exploit", "tune", "explore"],
        )
        parsed = parse_stream_event(e.model_dump())
        assert parsed.type == "session.start"

    def test_parses_each_candidate_event(self) -> None:
        events: list[dict[str, Any]] = [
            {"type": "candidate.start", "strategy": "tune", "candidateId": "c_2"},
            {"type": "candidate.title", "candidateId": "c_2", "title": "春のせり白ピザ"},
            {"type": "candidate.concept", "candidateId": "c_2", "concept": "ほろ苦さを朝食に"},
            {
                "type": "candidate.ingredients",
                "candidateId": "c_2",
                "ingredients": ["せり", "モッツァ"],
            },
            {"type": "candidate.sceneTags", "candidateId": "c_2", "sceneTags": ["朝食"]},
            {"type": "candidate.why", "candidateId": "c_2", "why": "一手だけ外した提案"},
            {"type": "candidate.done", "candidateId": "c_2"},
        ]
        for e in events:
            parsed = parse_stream_event(e)
            assert parsed.type == e["type"]

    def test_parses_session_done_and_error(self) -> None:
        assert parse_stream_event({"type": "session.done", "sessionId": "sess_xxx"}).type == (
            "session.done"
        )
        assert (
            parse_stream_event(
                {"type": "error", "code": "AGENT_TIMEOUT", "message": "timed out"}
            ).type
            == "error"
        )


class TestStreamEventBoundary:
    def test_rejects_unknown_type_discriminator(self) -> None:
        with pytest.raises(ValidationError):
            parse_stream_event({"type": "session.boom", "sessionId": "x"})

    def test_rejects_session_start_with_empty_session_id(self) -> None:
        with pytest.raises(ValidationError):
            parse_stream_event(
                {"type": "session.start", "sessionId": "", "strategies": ["exploit"]}
            )

    def test_rejects_session_start_with_empty_strategies(self) -> None:
        with pytest.raises(ValidationError):
            parse_stream_event({"type": "session.start", "sessionId": "x", "strategies": []})

    def test_rejects_invalid_strategy_enum(self) -> None:
        with pytest.raises(ValidationError):
            parse_stream_event(
                {"type": "candidate.start", "strategy": "random", "candidateId": "c_1"}
            )

    def test_rejects_candidate_title_missing_title(self) -> None:
        with pytest.raises(ValidationError):
            parse_stream_event({"type": "candidate.title", "candidateId": "c_1"})

    def test_rejects_candidate_ingredients_with_non_string_element(self) -> None:
        # Pydantic v2 では int は str に強制されるので、None を入れて確実に失敗させる
        bad: dict[str, Any] = {
            "type": "candidate.ingredients",
            "candidateId": "c_1",
            "ingredients": ["cheese", None],
        }
        with pytest.raises(ValidationError):
            parse_stream_event(bad)

    def test_rejects_error_event_with_missing_code(self) -> None:
        with pytest.raises(ValidationError):
            parse_stream_event({"type": "error", "message": "oops"})

    def test_rejects_non_object_input(self) -> None:
        with pytest.raises(ValidationError):
            parse_stream_event(None)
        with pytest.raises(ValidationError):
            parse_stream_event("session.start")
        with pytest.raises(ValidationError):
            parse_stream_event([])


class TestStreamEventTypeNarrowing:
    def test_discriminated_union_narrows_by_type(self) -> None:
        raw = {"type": "candidate.title", "candidateId": "c_1", "title": "X"}
        parsed = parse_stream_event(raw)
        if parsed.type == "candidate.title":
            assert len(parsed.title) > 0
        else:
            msg = "discriminator should narrow to candidate.title"
            raise AssertionError(msg)


class TestRecipeEvents:
    """Slice 3 で追加した recipe.* (7 種) の discriminated union 検証。"""

    def test_parses_recipe_start_and_done(self) -> None:
        assert parse_stream_event({"type": "recipe.start", "recipeId": "r_1"}).type == (
            "recipe.start"
        )
        assert parse_stream_event({"type": "recipe.done", "recipeId": "r_1"}).type == (
            "recipe.done"
        )

    def test_parses_recipe_title(self) -> None:
        e = RecipeTitleEvent(recipeId="r_1", title="松島の牡蠣と、名取のせり。")
        parsed = parse_stream_event(e.model_dump())
        assert parsed.type == "recipe.title"

    def test_parses_recipe_meta(self) -> None:
        raw: dict[str, Any] = {
            "type": "recipe.meta",
            "recipeId": "r_1",
            "meta": {
                "servings": "4 人分",
                "duration": "45m",
                "bakingTemp": "270°C",
                "difficulty": "★★☆",
            },
        }
        parsed = parse_stream_event(raw)
        assert parsed.type == "recipe.meta"

    def test_parses_recipe_materials(self) -> None:
        raw: dict[str, Any] = {
            "type": "recipe.materials",
            "recipeId": "r_1",
            "materials": [{"name": "強力粉", "quantity": "300g"}],
        }
        parsed = parse_stream_event(raw)
        assert parsed.type == "recipe.materials"

    def test_parses_recipe_steps(self) -> None:
        e = RecipeStepsEvent(recipeId="r_1", steps=["伸ばす", "乗せる", "焼く"])
        parsed = parse_stream_event(e.model_dump())
        assert parsed.type == "recipe.steps"

    def test_parses_recipe_story(self) -> None:
        e = RecipeStoryEvent(
            recipeId="r_1", eyebrow="ゲストに語る", headline="海と田畑。", body="b"
        )
        parsed = parse_stream_event(e.model_dump())
        assert parsed.type == "recipe.story"

    def test_rejects_recipe_materials_with_empty_list(self) -> None:
        with pytest.raises(ValidationError):
            parse_stream_event(
                {"type": "recipe.materials", "recipeId": "r_1", "materials": []},
            )

    def test_rejects_recipe_steps_with_empty_list(self) -> None:
        with pytest.raises(ValidationError):
            parse_stream_event({"type": "recipe.steps", "recipeId": "r_1", "steps": []})

    def test_rejects_recipe_event_with_empty_recipe_id(self) -> None:
        with pytest.raises(ValidationError):
            parse_stream_event({"type": "recipe.start", "recipeId": ""})


class TestImageEvents:
    """Slice 3 で追加した image.* (3 種) の検証。"""

    def test_parses_image_start(self) -> None:
        e = ImageStartEvent(recipeId="r_1")
        assert parse_stream_event(e.model_dump()).type == "image.start"

    def test_parses_image_ready_with_data_uri(self) -> None:
        e = ImageReadyEvent(recipeId="r_1", dataUri="data:image/png;base64,iVBORw0KG")
        parsed = parse_stream_event(e.model_dump())
        assert parsed.type == "image.ready"
        if parsed.type == "image.ready":
            assert parsed.dataUri.startswith("data:image/")

    def test_parses_image_error(self) -> None:
        e = ImageErrorEvent(recipeId="r_1", code="IMAGEN_FAIL", message="quota")
        parsed = parse_stream_event(e.model_dump())
        assert parsed.type == "image.error"

    def test_rejects_image_ready_with_empty_data_uri(self) -> None:
        with pytest.raises(ValidationError):
            parse_stream_event({"type": "image.ready", "recipeId": "r_1", "dataUri": ""})


class TestModelDumpJson:
    def test_round_trip_via_json(self) -> None:
        original = CandidateStartEvent(strategy="exploit", candidateId="c_1")
        json_str = original.model_dump_json()
        parsed = parse_stream_event(json.loads(json_str))
        assert parsed.type == "candidate.start"

    def test_emits_camel_case_keys_as_ts_expects(self) -> None:
        # TS 側 Zod スキーマは camelCase (sessionId, candidateId 等) を期待する
        e = SessionDoneEvent(sessionId="sess_x")
        dumped = json.loads(e.model_dump_json())
        assert "sessionId" in dumped
        assert dumped["sessionId"] == "sess_x"

        e2 = CandidateDoneEvent(candidateId="c_1")
        dumped2 = json.loads(e2.model_dump_json())
        assert "candidateId" in dumped2
