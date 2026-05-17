/**
 * createAgentClient — AGENT_MODE 環境変数で AgentClient 実装を切替えるファクトリ。
 *
 * - AGENT_MODE=http: HttpAgentClient (Python agent への HTTP)
 * - AGENT_MODE=mock (default): MockAgentClient (Slice 1 と同じ)
 *   テスト時 (NODE_ENV=test) は delayRange 0 で即時化
 *
 * BFF route から `const agent = createAgentClient()` で呼ぶ。
 * 同じ AgentClient インターフェースを実装するので route 側コード変更不要。
 */

import { HttpAgentClient } from './http-client';
import { MockAgentClient } from './mock-candidates';

import type { AgentClient } from './client';

export type AgentMode = 'mock' | 'http';

export function createAgentClient(): AgentClient {
  const mode = (process.env.AGENT_MODE ?? 'mock') as AgentMode;
  if (mode === 'http') {
    const baseUrl = process.env.AGENT_BASE_URL ?? 'http://localhost:8001';
    const timeoutMs = process.env.AGENT_TIMEOUT_MS
      ? Number(process.env.AGENT_TIMEOUT_MS)
      : undefined;
    return new HttpAgentClient(timeoutMs !== undefined ? { baseUrl, timeoutMs } : { baseUrl });
  }
  return new MockAgentClient(
    process.env.NODE_ENV === 'test' ? { delayRange: { min: 0, max: 0 } } : {},
  );
}
