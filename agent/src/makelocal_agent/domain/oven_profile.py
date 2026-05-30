"""機材プロファイル (オーブン種別) ドメイン定義。

Slice 8 で導入。フロント (src/domain/oven-profile.ts) と同じ ID 体系を
共有し、レシピ生成プロンプトに「どの機材で焼く前提か」を載せる。

- `enro_450c_90s` がデフォルト (推奨機材: ENRO 電気ピザ窯)
- `home_oven_280c_10m` は補足プロファイル (250〜300℃ の家庭用オーブン)

`prompt_directive` は detail_agent.build_detail_prompt() に注入され、
生成される `meta.bakingTemp` / `meta.duration` / 材料量・水分指示の制約となる。
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

OvenProfileId = Literal["enro_450c_90s", "home_oven_280c_10m"]


@dataclass(frozen=True)
class OvenProfile:
    id: OvenProfileId
    jp_label: str
    temp_line: str
    time_line: str
    temp_target_celsius: str  # 「400°C」など単一値。bakingTemp 出力値の参考に
    prompt_directive: str  # LLM へ渡す機材前提文 (温度・水分・厚さ等)


ENRO_PROFILE = OvenProfile(
    id="enro_450c_90s",
    jp_label="ENRO 電気ピザ窯",
    temp_line="400〜450°C",
    time_line="90〜120 秒",
    temp_target_celsius="420°C",
    prompt_directive=(
        "【機材前提】\n"
        "400〜450°C / 90〜120 秒で焼成できる ENRO 電気ピザ窯を前提に最適化してください。\n"
        "- meta.bakingTemp は 400〜450°C の範囲で (例: '420°C')\n"
        "- meta.duration は焼成 + 準備込みで 30〜45 分前後\n"
        "- 生地は中央 4mm / 縁 8mm 目安の薄手・高加水ナポリ寄り\n"
        "- トッピングの水分は予め水切りすること\n"
        "- チーズは焼成終盤・短時間で溶ける前提"
    ),
)

HOME_OVEN_PROFILE = OvenProfile(
    id="home_oven_280c_10m",
    jp_label="家庭用オーブン",
    temp_line="250〜300°C",
    time_line="8〜15 分",
    temp_target_celsius="280°C",
    prompt_directive=(
        "【機材前提】\n"
        "250〜300°C 上限の家庭用オーブンを前提に再生成してください。\n"
        "- meta.bakingTemp は 250〜300°C の範囲で (例: '280°C')\n"
        "- meta.duration は焼成 + 準備込みで 30〜45 分、焼成時間は 8〜15 分\n"
        "- 生地はやや厚め (中央 6mm / 縁 10mm)、加水率は低め推奨\n"
        "- 水分の多い具は予め水切り / 加熱して使う\n"
        "- ナポリ寄りではなく、家庭オーブンで再現可能なレシピに調整"
    ),
)

OVEN_PROFILES: dict[OvenProfileId, OvenProfile] = {
    "enro_450c_90s": ENRO_PROFILE,
    "home_oven_280c_10m": HOME_OVEN_PROFILE,
}

DEFAULT_OVEN_PROFILE_ID: OvenProfileId = "enro_450c_90s"


def resolve_oven_profile(profile_id: OvenProfileId | str | None) -> OvenProfile:
    """ID を OvenProfile に解決する。未知 / None → デフォルト (ENRO)。"""
    if profile_id is None:
        return OVEN_PROFILES[DEFAULT_OVEN_PROFILE_ID]
    if profile_id in OVEN_PROFILES:
        return OVEN_PROFILES[profile_id]
    return OVEN_PROFILES[DEFAULT_OVEN_PROFILE_ID]
