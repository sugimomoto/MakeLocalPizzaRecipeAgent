"""Locale ドメイン型 — TypeScript の src/domain/locale.ts と semantic 同期。

- LocaleId は "miyagi" や "miyagi-sendai" 形式の kebab-case 文字列
- Region は日本の 8 地方区分 (TS 側と完全一致)
- City は MVP では空配列許容 (Locale.cities は Optional)
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

type LocaleId = str

Region = Literal[
    "hokkaido",
    "tohoku",
    "kanto",
    "chubu",
    "kinki",
    "chugoku",
    "shikoku",
    "kyushu-okinawa",
]

REGIONS: tuple[Region, ...] = (
    "hokkaido",
    "tohoku",
    "kanto",
    "chubu",
    "kinki",
    "chugoku",
    "shikoku",
    "kyushu-okinawa",
)


class City(BaseModel):
    """市区町村 (locale 内のサブ地名)。"""

    id: str = Field(min_length=1)
    name: str = Field(min_length=1)


class Locale(BaseModel):
    """地元 (Tap1 で選択する単位)。"""

    id: LocaleId = Field(min_length=1)
    prefecture: str = Field(min_length=1)
    prefectureCode: str = Field(pattern=r"^JP-\d{2}$")
    region: Region
    cities: list[City] | None = None


def is_region(value: object) -> bool:
    """値が Region リテラルのいずれかか判定する (TS 側 isRegion と等価)。"""
    return isinstance(value, str) and value in REGIONS
