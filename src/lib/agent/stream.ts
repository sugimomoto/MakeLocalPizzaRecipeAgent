/**
 * NDJSON ストリームヘルパ。
 *
 * - サーバ (BFF): イベント列 → ReadableStream<Uint8Array>
 * - クライアント (UI): ReadableStream<Uint8Array> → AsyncGenerator<<sub-union>>
 *
 * decode は **schema を渡してジェネリック**に動く。各 hook (use-quicktap-stream /
 * use-recipe-detail-stream) は自分のサブユニオン (`CandidateStreamEventSchema` /
 * `RecipeDetailStreamEventSchema`) を渡し、型 narrowing と switch の網羅性検査を
 * その範囲だけで効かせる。schema を省略すると全イベント (`StreamEventSchema`) で
 * フォールバックする (encoder 側 / テスト用)。
 *
 * Content-Type は呼び出し側で application/x-ndjson を付ける。
 * Zod による各行のバリデーションは decode 側で必須 (異常 JSON はスキップしない、throw する)。
 */

import { StreamEventSchema, type StreamEvent } from '@/domain/schemas';

import type { z } from 'zod';

const NEWLINE = '\n';

/**
 * StreamEvent の AsyncIterable を NDJSON バイト列ストリームに変換。
 * 1 イベントごとに `${JSON.stringify(event)}\n` を enqueue する。
 */
export function encodeNdjsonStream(events: AsyncIterable<StreamEvent>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of events) {
          const line = `${JSON.stringify(event)}${NEWLINE}`;
          controller.enqueue(encoder.encode(line));
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

/**
 * NDJSON バイト列ストリームを `schema` で検証した型 T の AsyncGenerator に変換。
 *
 * - チャンク境界をまたぐ行も再構成する (行バッファ)
 * - 各行を JSON.parse → Zod でバリデーション
 * - スキーマ違反は throw (UI 側で error 状態として扱う)
 * - 末尾改行なしで終わってもバッファ残りを 1 行として処理
 *
 * @param schema 省略時は全イベント (`StreamEventSchema`)。各 hook は自分の
 *               サブユニオンスキーマを渡して switch の網羅性を狭める。
 */
export async function* decodeNdjsonStream<T = StreamEvent>(
  stream: ReadableStream<Uint8Array>,
  schema: z.ZodType<T> = StreamEventSchema as unknown as z.ZodType<T>,
): AsyncGenerator<T, void, void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        // flush 残バイト
        buffer += decoder.decode();
        break;
      }
      buffer += decoder.decode(value, { stream: true });

      let newlineIdx = buffer.indexOf(NEWLINE);
      while (newlineIdx !== -1) {
        const line = buffer.slice(0, newlineIdx);
        buffer = buffer.slice(newlineIdx + 1);
        if (line.length > 0) {
          yield parseLine(line, schema);
        }
        newlineIdx = buffer.indexOf(NEWLINE);
      }
    }

    // 末尾改行なしで残ったバッファ
    const tail = buffer.trim();
    if (tail.length > 0) {
      yield parseLine(tail, schema);
    }
  } finally {
    reader.releaseLock();
  }
}

function parseLine<T>(line: string, schema: z.ZodType<T>): T {
  let json: unknown;
  try {
    json = JSON.parse(line);
  } catch (cause) {
    throw new Error(`NDJSON: invalid JSON line: ${line.slice(0, 80)}`, { cause });
  }
  return schema.parse(json);
}
