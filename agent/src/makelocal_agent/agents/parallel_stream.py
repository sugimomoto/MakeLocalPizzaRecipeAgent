"""並列タスク → asyncio.Queue → 順次 yield の共通ドレーン。

orchestrator.py / recipe_orchestrator.py で重複していた
「TaskGroup で複数タスクを並列起動 → Queue へ put されたイベントを完了順に yield →
sentinel で終了 → runner の例外を呼び出し側へ伝搬」の骨格を共通化する。
各オーケストレータは「どのタスクを起動するか」「前後に何を yield するか」だけを書く。

async の例外伝搬 (TaskGroup の例外を runner_task 経由で取り出す finally) は
取り違えやすいため、1 箇所に集約して検証する価値がある。
"""

from __future__ import annotations

import asyncio
import contextlib
from collections.abc import AsyncIterator, Callable, Coroutine, Sequence
from typing import Any

from ..domain.stream import StreamEvent

# Queue の終端マーカ。StreamEvent と区別できる一意なオブジェクト。
SENTINEL: object = object()


async def drain_parallel_event_tasks(
    queue: asyncio.Queue[StreamEvent | object],
    task_factories: Sequence[Callable[[], Coroutine[Any, Any, None]]],
) -> AsyncIterator[StreamEvent]:
    """task_factories を TaskGroup で並列実行し、queue に put された StreamEvent を
    完了順に yield する。

    呼び出し側で queue を生成し、各タスク (queue.put する coroutine) を 0 引数の
    ファクトリとして渡す。全タスク完了で sentinel を流して終了。runner の例外
    (TaskGroup 内の未処理例外など) は finally で呼び出し側へ re-raise する。
    """

    async def runner() -> None:
        async with asyncio.TaskGroup() as tg:
            for factory in task_factories:
                tg.create_task(factory())
        # 全タスク完了 → sentinel を入れて drain を終了させる
        await queue.put(SENTINEL)

    runner_task = asyncio.create_task(runner())
    try:
        while True:
            item = await queue.get()
            if item is SENTINEL:
                break
            # item は SENTINEL でないので必ず StreamEvent
            yield item  # type: ignore[misc]
    finally:
        # runner_task が例外で終わった場合に伝搬させる
        if not runner_task.done():
            runner_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await runner_task
        else:
            exc = runner_task.exception()
            if exc is not None:
                raise exc
