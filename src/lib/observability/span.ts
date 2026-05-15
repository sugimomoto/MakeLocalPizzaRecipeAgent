/**
 * withSpan — トレーススパンを表現するラッパ。
 *
 * Slice 1 では no-op (関数を実行して結果を返すだけ)。
 * Slice 6 で OpenTelemetry / Cloud Trace に差し替えるための **API 形を先に決めておく**。
 *
 * 使い方:
 *   await withSpan('agent.generate', async (span) => {
 *     span.setAttribute('localeId', input.localeId);
 *     return await agent.generateCandidates(input);
 *   });
 *
 * 同期関数も async 関数も両方サポート。
 */

import type { LogContext } from './logger';

export type SpanAttributes = LogContext;

export type Span = {
  readonly name: string;
  setAttribute: (key: string, value: unknown) => void;
  setAttributes: (attrs: SpanAttributes) => void;
  recordException: (error: unknown) => void;
};

export type SpanOptions = {
  attributes?: SpanAttributes;
};

class NoopSpan implements Span {
  readonly name: string;
  private readonly attributes: SpanAttributes;

  constructor(name: string, initial: SpanAttributes = {}) {
    this.name = name;
    this.attributes = { ...initial };
  }

  setAttribute(key: string, value: unknown): void {
    this.attributes[key] = value;
  }

  setAttributes(attrs: SpanAttributes): void {
    Object.assign(this.attributes, attrs);
  }

  recordException(_error: unknown): void {
    // Slice 1 では no-op (Slice 6 で OTel SpanRecorder に差し替え)
  }

  /** テスト用に蓄積された属性を観察する。プロダクションコードからは使わない。 */
  _snapshotAttributes(): SpanAttributes {
    return { ...this.attributes };
  }
}

export function createSpan(name: string, options: SpanOptions = {}): Span {
  return new NoopSpan(name, options.attributes);
}

export async function withSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T> | T,
  options: SpanOptions = {},
): Promise<T> {
  const span = createSpan(name, options);
  try {
    return await fn(span);
  } catch (error) {
    span.recordException(error);
    throw error;
  }
}
