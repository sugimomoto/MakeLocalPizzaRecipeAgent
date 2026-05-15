import { describe, expect, it } from 'vitest';

import { decodeNdjsonStream, encodeNdjsonStream } from './stream';

import type { StreamEvent } from '@/domain/schemas';

async function* aiter<T>(items: T[]): AsyncGenerator<T> {
  for (const i of items) yield i;
}

function chunkedStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
}

async function readAllText(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder('utf-8');
  let out = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      out += decoder.decode();
      break;
    }
    out += decoder.decode(value, { stream: true });
  }
  return out;
}

async function collect<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const item of gen) out.push(item);
  return out;
}

const SAMPLE_EVENTS: StreamEvent[] = [
  { type: 'session.start', sessionId: 's1', strategies: ['exploit', 'tune', 'explore'] },
  { type: 'candidate.start', strategy: 'exploit', candidateId: 'c1' },
  { type: 'candidate.title', candidateId: 'c1', title: '王道ピザ' },
  { type: 'candidate.done', candidateId: 'c1' },
  { type: 'session.done', sessionId: 's1' },
];

describe('encodeNdjsonStream', () => {
  it('emits one JSON line per event with trailing newline', async () => {
    const stream = encodeNdjsonStream(aiter(SAMPLE_EVENTS));
    const text = await readAllText(stream);
    const lines = text.split('\n');
    // 末尾改行ありなので最後は空
    expect(lines.at(-1)).toBe('');
    const nonEmpty = lines.slice(0, -1);
    expect(nonEmpty).toHaveLength(SAMPLE_EVENTS.length);
    for (let i = 0; i < SAMPLE_EVENTS.length; i++) {
      expect(JSON.parse(nonEmpty[i] ?? '')).toEqual(SAMPLE_EVENTS[i]);
    }
  });

  it('propagates errors thrown by the source iterable', async () => {
    async function* boom(): AsyncGenerator<StreamEvent> {
      yield { type: 'session.start', sessionId: 's', strategies: ['exploit'] };
      throw new Error('source-failure');
    }
    const stream = encodeNdjsonStream(boom());
    await expect(readAllText(stream)).rejects.toThrow('source-failure');
  });

  it('produces an empty stream when there are no events', async () => {
    const stream = encodeNdjsonStream(aiter<StreamEvent>([]));
    expect(await readAllText(stream)).toBe('');
  });
});

describe('decodeNdjsonStream', () => {
  it('parses sequential lines from a single chunk', async () => {
    const lines = SAMPLE_EVENTS.map((e) => `${JSON.stringify(e)}\n`).join('');
    const events = await collect(decodeNdjsonStream(chunkedStream([lines])));
    expect(events).toEqual(SAMPLE_EVENTS);
  });

  it('reassembles a JSON line that is split across chunks', async () => {
    const full = `${JSON.stringify(SAMPLE_EVENTS[0])}\n${JSON.stringify(SAMPLE_EVENTS[1])}\n`;
    // 16, 32, rest にチャンク分割
    const chunks = [full.slice(0, 16), full.slice(16, 32), full.slice(32)];
    const events = await collect(decodeNdjsonStream(chunkedStream(chunks)));
    expect(events).toEqual([SAMPLE_EVENTS[0], SAMPLE_EVENTS[1]]);
  });

  it('handles multiple events in a single chunk', async () => {
    const blob = SAMPLE_EVENTS.map((e) => `${JSON.stringify(e)}\n`).join('');
    const events = await collect(decodeNdjsonStream(chunkedStream([blob])));
    expect(events).toEqual(SAMPLE_EVENTS);
  });

  it('processes a final unterminated line at end-of-stream', async () => {
    const noTrailing = `${JSON.stringify(SAMPLE_EVENTS[0])}\n${JSON.stringify(SAMPLE_EVENTS[1])}`; // 末尾改行なし
    const events = await collect(decodeNdjsonStream(chunkedStream([noTrailing])));
    expect(events).toEqual([SAMPLE_EVENTS[0], SAMPLE_EVENTS[1]]);
  });

  it('throws on invalid JSON', async () => {
    const stream = chunkedStream([`{"type":"session.start"\n`]); // 閉じカッコなし
    await expect(collect(decodeNdjsonStream(stream))).rejects.toThrow(/invalid JSON/);
  });

  it('throws on JSON that does not match StreamEventSchema', async () => {
    const stream = chunkedStream([`{"type":"unknown.event"}\n`]);
    await expect(collect(decodeNdjsonStream(stream))).rejects.toThrow();
  });

  it('roundtrip: encode → decode reproduces the input event sequence', async () => {
    const encoded = encodeNdjsonStream(aiter(SAMPLE_EVENTS));
    const events = await collect(decodeNdjsonStream(encoded));
    expect(events).toEqual(SAMPLE_EVENTS);
  });
});
