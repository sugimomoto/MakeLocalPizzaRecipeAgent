"""ルート共通: localeId + ingredient ID 配列 → Locale / Ingredient の解決。

candidates / recipes / reroll で重複していた「locale 検索 (404) → ingredient 解決
(400) → (任意で) hints 構築」を 1 箇所に集約する。HTTPException の detail 形式は
既存と同一 (LOCALE_NOT_FOUND / INGREDIENT_NOT_FOUND) を維持する。
"""

from __future__ import annotations

from fastapi import HTTPException

from ..data.ingredients_repository import IngredientsRepository
from ..domain.ingredient import Ingredient
from ..domain.locale import Locale


def resolve_locale_and_ingredients(
    repo: IngredientsRepository,
    locale_id: str,
    ingredient_ids: list[str],
    *,
    with_hints: bool = False,
) -> tuple[Locale, list[Ingredient], list[Ingredient]]:
    """locale と selected ingredients を解決する。オプションで hints も構築する。

    - locale が未対応なら 404 LOCALE_NOT_FOUND
    - ingredient ID が未知なら 400 INGREDIENT_NOT_FOUND
    - with_hints=True のとき、hints は同 locale 内で selected に含まれない最大 5 件
    """
    locale = repo.find_locale(locale_id)
    if locale is None:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "LOCALE_NOT_FOUND", "message": locale_id}},
        )

    all_ings = repo.list_ingredients(locale_id) or []
    by_id = {ing.id: ing for ing in all_ings}
    selected: list[Ingredient] = []
    for ing_id in ingredient_ids:
        ing = by_id.get(ing_id)
        if ing is None:
            raise HTTPException(
                status_code=400,
                detail={"error": {"code": "INGREDIENT_NOT_FOUND", "message": ing_id}},
            )
        selected.append(ing)

    hints: list[Ingredient] = []
    if with_hints:
        selected_ids = {i.id for i in selected}
        hints = [i for i in all_ings if i.id not in selected_ids][:5]
    return locale, selected, hints
