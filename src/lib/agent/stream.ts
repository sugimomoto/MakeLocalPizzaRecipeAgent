/**
 * NDJSON ストリームヘルパ。
 *
 * - サーバ (BFF): イベント列 → ReadableStream<Uint8Array>
 * - クライアント (UI): ReadableStream<Uint8Array> → AsyncGenerator<StreamEvent>
 *
 * Content-Type は呼び出し側で application/x-ndjson を付ける。
 * Zod による各行のバリデーションは decode 側で必須 (異常 JSON はスキップしない、throw する)。
 */

import { StreamEventSchema, type StreamEvent } from '@/domain/schemas';

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
 * NDJSON バイト列ストリームを StreamEvent の AsyncGenerator に変換。
 *
 * - チャンク境界をまたぐ行も再構成する (行バッファ)
 * - 各行を JSON.parse → Zod でバリデーション
 * - スキーマ違反は throw (UI 側で error イベントとして扱う)
 * - 末尾改行なしで終わってもバッファ残りを 1 行として処理
 */
export async function* decodeNdjsonStream(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<StreamEvent, void, void> {
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
          yield parseLine(line);
        }
        newlineIdx = buffer.indexOf(NEWLINE);
      }
    }

    // 末尾改行なしで残ったバッファ
    const tail = buffer.trim();
    if (tail.length > 0) {
      yield parseLine(tail);
    }
  } finally {
    reader.releaseLock();
  }
}

function parseLine(line: string): StreamEvent {
  let json: unknown;
  try {
    json = JSON.parse(line);
  } catch (cause) {
    throw new Error(`NDJSON: invalid JSON line: ${line.slice(0, 80)}`, { cause });
  }
  return StreamEventSchema.parse(json);
}
