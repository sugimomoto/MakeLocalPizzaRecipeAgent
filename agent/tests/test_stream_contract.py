"""TS ⇔ Python ストリームスキーマ契約テスト (Phase 3)。

Python (Pydantic) と TypeScript (Zod) は NDJSON ストリームイベントのスキーマを
2 箇所で独立に管理している。新しいイベント型の追加時に片方の更新を忘れると、
本番で初めて validation エラーが顕在化する。これを防ぐため:

1. 全 StreamEvent サブタイプの代表インスタンスを 1 件ずつ NDJSON で書き出し、
   `src/domain/__fixtures__/stream-events.generated.ndjson` にコミットする。
2. TS 側の契約テスト (schemas.contract.test.ts) がこの fixture を Zod でパースし、
   フィールド名・enum 値・必須性が一致することを検証する。
3. 本テストは「代表インスタンスが union の全メンバーを網羅していること」と
   「コミット済み fixture が最新であること」を保証する。

fixture を再生成するには:
    UPDATE_FIXTURES=1 uv run pytest tests/test_stream_contract.py
"""

from __future__ import annotations

import os
import typing
from pathlib import Path

from makelocal_agent.domain.recipe import RecipeMaterial, RecipeMeta
from makelocal_agent.domain.stream import (
    CandidateConceptEvent,
    CandidateDoneEvent,
    CandidateIngredientsEvent,
    CandidateSceneTagsEvent,
    CandidateStartEvent,
    CandidateTitleEvent,
    CandidateWhyEvent,
    ErrorEvent,
    ImageErrorEvent,
    ImageReadyEvent,
    ImageStartEvent,
    RecipeDoneEvent,
    RecipeMaterialsEvent,
    RecipeMetaEvent,
    RecipeStartEvent,
    RecipeStepsEvent,
    RecipeStoryEvent,
    RecipeTitleEvent,
    SessionDoneEvent,
    SessionStartEvent,
    StreamEvent,
)

# リポジトリルート (agent/tests → agent → repo) から見た fixture の配置先。
_FIXTURE_PATH = (
    Path(__file__).resolve().parents[2]
    / "src"
    / "domain"
    / "__fixtures__"
    / "stream-events.generated.ndjson"
)


def build_representative_events() -> list[object]:
    """全 19 サブタイプの代表インスタンスを union 宣言順で 1 件ずつ返す。"""
    return [
        SessionStartEvent(sessionId="sess_fixture", strategies=["exploit", "tune", "explore"]),
        CandidateStartEvent(strategy="exploit", candidateId="c1"),
        CandidateTitleEvent(candidateId="c1", title="王道の牡蠣ピザ"),
        CandidateConceptEvent(candidateId="c1", concept="海の旨味を素直に"),
        CandidateIngredientsEvent(candidateId="c1", ingredients=["牡蠣", "せり"]),
        CandidateSceneTagsEvent(candidateId="c1", sceneTags=["週末家族"]),
        CandidateWhyEvent(candidateId="c1", why="王道の組み合わせだから"),
        CandidateDoneEvent(candidateId="c1"),
        SessionDoneEvent(sessionId="sess_fixture"),
        ErrorEvent(code="AGENT_ERROR", message="something went wrong"),
        RecipeStartEvent(recipeId="c1"),
        RecipeTitleEvent(recipeId="c1", title="松島の牡蠣ピザ"),
        RecipeMetaEvent(
            recipeId="c1",
            meta=RecipeMeta(
                servings="ピザ 1 枚分",
                duration="45m",
                bakingTemp="270°C",
                difficulty="★★☆",
            ),
        ),
        RecipeMaterialsEvent(
            recipeId="c1",
            materials=[
                RecipeMaterial(name="強力粉", quantity="300g"),
                RecipeMaterial(name="牡蠣", quantity="10 個"),
            ],
        ),
        RecipeStepsEvent(recipeId="c1", steps=["生地を伸ばす", "牡蠣をのせる", "焼く"]),
        RecipeStoryEvent(
            recipeId="c1",
            eyebrow="ゲストに語る",
            headline="松島の夜。",
            body="海と山の境界に置く一枚。",
        ),
        RecipeDoneEvent(recipeId="c1"),
        ImageStartEvent(recipeId="c1"),
        ImageReadyEvent(recipeId="c1", url="https://storage.test/recipes/c1.png"),
        ImageErrorEvent(recipeId="c1", code="IMAGE_FAIL", message="imagen unavailable"),
    ]


def render_ndjson() -> str:
    """代表イベントを NDJSON (1 行 1 イベント、末尾改行あり) に整形する。"""
    events = build_representative_events()
    lines = [e.model_dump_json() for e in events]  # type: ignore[attr-defined]
    return "\n".join(lines) + "\n"


def _all_union_type_literals() -> set[str]:
    """StreamEvent discriminated union の全メンバーの type リテラル値を集める。"""
    # StreamEvent = Annotated[A | B | ..., Field(discriminator="type")]
    union = typing.get_args(StreamEvent)[0]
    members = typing.get_args(union)
    types: set[str] = set()
    for member in members:
        default = member.model_fields["type"].default
        assert isinstance(default, str)
        types.add(default)
    return types


def test_representative_events_cover_all_union_members() -> None:
    """代表インスタンスが union の全サブタイプを過不足なく網羅していること。"""
    covered = {e.type for e in build_representative_events()}  # type: ignore[attr-defined]
    expected = _all_union_type_literals()
    missing = expected - covered
    extra = covered - expected
    assert not missing, f"代表インスタンス未網羅のイベント型: {sorted(missing)}"
    assert not extra, f"union に存在しないイベント型: {sorted(extra)}"


def test_committed_fixture_is_up_to_date() -> None:
    """コミット済み fixture が現在のスキーマから再生成した内容と一致すること。

    UPDATE_FIXTURES=1 のときは比較せず再生成して書き出す。
    """
    content = render_ndjson()

    if os.environ.get("UPDATE_FIXTURES") == "1":
        _FIXTURE_PATH.parent.mkdir(parents=True, exist_ok=True)
        _FIXTURE_PATH.write_text(content, encoding="utf-8")
        return

    assert _FIXTURE_PATH.exists(), (
        f"fixture が存在しません。`UPDATE_FIXTURES=1 uv run pytest "
        f"tests/test_stream_contract.py` で生成してください: {_FIXTURE_PATH}"
    )
    committed = _FIXTURE_PATH.read_text(encoding="utf-8")
    assert committed == content, (
        "コミット済み fixture が最新スキーマと一致しません。"
        "`UPDATE_FIXTURES=1 uv run pytest tests/test_stream_contract.py` で再生成してください。"
    )
