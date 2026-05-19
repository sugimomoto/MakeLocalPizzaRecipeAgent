"""手動 refresh スクリプト: 全食材について楽天 API を叩いて Firestore キャッシュに保存。

3 層分離のうち **唯一** 楽天 API を直接叩く処理。runtime からは Firestore 経由のみ。

使い方:
    # オフライン動作確認 (Firestore に書かず InMemory + stdout に件数だけ出す)
    cd agent
    uv run python scripts/refresh_furusato_cache.py --dry-run --in-memory

    # Emulator に書き込む (Firestore Emulator が起動済の前提)
    FIRESTORE_EMULATOR_HOST=localhost:8081 \\
      MLPR_GOOGLE_CLOUD_PROJECT=mlpr-local \\
      uv run python scripts/refresh_furusato_cache.py

    # 特定食材だけ (デバッグ用)
    uv run python scripts/refresh_furusato_cache.py --only miyagi-oyster

    # 件数だけ可視化 (本走前のサニティチェック)
    uv run python scripts/refresh_furusato_cache.py --dry-run

オプション:
    --max-items 3        各食材につき取得する返礼品の上限 (既定 3)
    --dry-run            cache に書き込まず stdout に出力するだけ
    --in-memory          Firestore に書かず InMemory cache を使う (動作確認用)
    --only <id>          指定した ingredient_id だけを refresh

必要な env (.env から自動 load):
    RAKUTEN_APPLICATION_ID  楽天 Web Service の Application ID (UUID 形式)
    RAKUTEN_ACCESS_KEY      新エンドポイントの accessKey (pk_*)
    RAKUTEN_AFFILIATE_ID    楽天アフィリエイト ID (任意)
    MLPR_GOOGLE_CLOUD_PROJECT Firestore mode で必須

ログ: 1 食材ごとに JSON 1 行を stdout に出す (Cloud Logging で集計可能)。
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
import time
from pathlib import Path

# `agent/` を起点に絶対 import できるようパスを通す
_AGENT_ROOT = Path(__file__).resolve().parent.parent
_SRC = _AGENT_ROOT / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

# .env を読み込む (uv の virtualenv + pydantic-settings が .env を見るので不要だが、
# RAKUTEN_* / FIRESTORE_EMULATOR_HOST はそのまま os.environ 経由でも見たいので明示)
try:
    from dotenv import load_dotenv  # type: ignore[import-not-found]
except ImportError:
    load_dotenv = None  # type: ignore[assignment]

if load_dotenv is not None:
    load_dotenv(_AGENT_ROOT / ".env", override=False)
    load_dotenv(_AGENT_ROOT.parent / ".env", override=False)

from makelocal_agent.domain.furusato import FurusatoItem  # noqa: E402
from makelocal_agent.domain.ingredient import Ingredient  # noqa: E402
from makelocal_agent.furusato.cache import (  # noqa: E402
    FirestoreFurusatoCache,
    FurusatoCache,
    InMemoryFurusatoCache,
)
from makelocal_agent.furusato.normalize import from_rakuten_item  # noqa: E402
from makelocal_agent.furusato.rakuten_client import RakutenClient  # noqa: E402
from makelocal_agent.data.ingredients_repository import IngredientsRepository  # noqa: E402
from makelocal_agent.lib.settings import get_rakuten_settings, get_settings  # noqa: E402


def _build_keyword(ing: Ingredient) -> str:
    """ingredient の searchQuery > name の優先で keyword を構築。

    そのまま `RakutenClient.search_furusato` に渡せば「ふるさと納税」AND 結合
    は client 側で行う。
    """
    if ing.searchQuery:
        return ing.searchQuery
    return ing.name


def _emit_log(payload: dict) -> None:
    """1 食材につき JSON 1 行を stdout に出す (Cloud Logging 互換)。"""
    print(json.dumps(payload, ensure_ascii=False))


async def _refresh_one(
    *,
    client: RakutenClient,
    cache: FurusatoCache | None,
    ingredient: Ingredient,
    max_items: int,
    dry_run: bool,
) -> dict:
    """1 食材について楽天 API を叩いて normalize → cache.set。

    Returns:
        1 行 JSON 用の dict
    """
    keyword = _build_keyword(ingredient)
    started = time.monotonic()

    raw_items = await client.search_furusato(keyword, max_items=max_items)
    normalized: list[FurusatoItem] = []
    for raw in raw_items:
        item = from_rakuten_item(raw, ingredient_id=ingredient.id)
        if item is not None:
            normalized.append(item)

    elapsed_ms = int((time.monotonic() - started) * 1000)

    if not dry_run and cache is not None:
        await cache.set(ingredient.id, normalized)

    return {
        "ingredientId": ingredient.id,
        "name": ingredient.name,
        "localeId": ingredient.localeId,
        "queryUsed": keyword,
        "rawCount": len(raw_items),
        "normalizedCount": len(normalized),
        "elapsedMs": elapsed_ms,
        "dryRun": dry_run,
        "titles": [it.title for it in normalized],
    }


def _build_cache(*, in_memory: bool, project_id: str) -> FurusatoCache | None:
    if in_memory:
        return InMemoryFurusatoCache()
    if not project_id:
        # 本番モードだがプロジェクト未指定。書き込み不可なのでログ出力のみ。
        print(
            "warning: MLPR_GOOGLE_CLOUD_PROJECT が未設定です。--dry-run / --in-memory を指定してください。",
            file=sys.stderr,
        )
        return None
    return FirestoreFurusatoCache(project_id=project_id)


async def _async_main(args: argparse.Namespace) -> int:
    s = get_settings()
    rs = get_rakuten_settings()

    if not rs.rakuten_application_id or not rs.rakuten_access_key:
        print(
            "error: RAKUTEN_APPLICATION_ID と RAKUTEN_ACCESS_KEY が必要です (.env を確認)。",
            file=sys.stderr,
        )
        return 2

    ingredients_path = _AGENT_ROOT / s.ingredients_yaml_path
    repo = IngredientsRepository.from_yaml(ingredients_path)

    # 対象 ingredient のリストを構築
    all_ingredients: list[Ingredient] = []
    for locale in repo.list_locales():
        ings = repo.list_ingredients(locale.id) or []
        all_ingredients.extend(ings)

    targets: list[Ingredient]
    if args.only:
        targets = [i for i in all_ingredients if i.id == args.only]
        if not targets:
            print(f"error: ingredient id '{args.only}' not found in YAML", file=sys.stderr)
            return 2
    else:
        targets = all_ingredients

    cache = _build_cache(in_memory=args.in_memory, project_id=s.google_cloud_project)
    # dry-run でなく cache 構築失敗 (本番モードだが project 未指定) → 終了
    if not args.dry_run and cache is None:
        return 2

    summary = {
        "endpoint": "openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260401",
        "applicationId": rs.rakuten_application_id[:8] + "...",
        "totalIngredients": len(targets),
        "maxItems": args.max_items,
        "dryRun": args.dry_run,
        "inMemory": args.in_memory,
        "ingredientsYamlPath": str(ingredients_path),
    }
    print(f"# {json.dumps(summary, ensure_ascii=False)}")

    async with RakutenClient(
        application_id=rs.rakuten_application_id,
        access_key=rs.rakuten_access_key,
        affiliate_id=rs.rakuten_affiliate_id or None,
    ) as client:
        total_items = 0
        for ing in targets:
            try:
                result = await _refresh_one(
                    client=client,
                    cache=cache,
                    ingredient=ing,
                    max_items=args.max_items,
                    dry_run=args.dry_run,
                )
                _emit_log(result)
                total_items += result["normalizedCount"]
            except Exception as e:  # noqa: BLE001  # 全食材を続行
                _emit_log(
                    {
                        "ingredientId": ing.id,
                        "name": ing.name,
                        "queryUsed": _build_keyword(ing),
                        "error": str(e),
                    }
                )

    # 結果サマリ (低件数の食材を最後にまとめて報告)
    print(f"# total items written: {total_items}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Refresh Rakuten furusato cache for all ingredients.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--max-items",
        type=int,
        default=3,
        help="各食材につき取得する上限 (1〜30、既定 3)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="cache に書き込まず stdout に出力するだけ",
    )
    parser.add_argument(
        "--in-memory",
        action="store_true",
        help="Firestore を使わず InMemoryFurusatoCache に書く (検証用)",
    )
    parser.add_argument(
        "--only",
        type=str,
        default=None,
        help="指定した ingredient_id だけを refresh",
    )

    args = parser.parse_args()
    # FIRESTORE_EMULATOR_HOST を env から拾って表示 (デバッグ用)
    emu = os.environ.get("FIRESTORE_EMULATOR_HOST")
    if emu and not args.in_memory and not args.dry_run:
        print(f"# FIRESTORE_EMULATOR_HOST={emu}", file=sys.stderr)
    return asyncio.run(_async_main(args))


if __name__ == "__main__":
    sys.exit(main())
