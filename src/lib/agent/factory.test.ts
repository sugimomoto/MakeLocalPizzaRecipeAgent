import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAgentClient } from './factory';
import { HttpAgentClient } from './http-client';
import { MockAgentClient } from './mock-candidates';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('createAgentClient', () => {
  it('defaults to MockAgentClient when AGENT_MODE is unset', () => {
    vi.stubEnv('AGENT_MODE', '');
    const client = createAgentClient();
    expect(client).toBeInstanceOf(MockAgentClient);
  });

  it('returns MockAgentClient when AGENT_MODE=mock', () => {
    vi.stubEnv('AGENT_MODE', 'mock');
    expect(createAgentClient()).toBeInstanceOf(MockAgentClient);
  });

  it('returns HttpAgentClient when AGENT_MODE=http', () => {
    vi.stubEnv('AGENT_MODE', 'http');
    vi.stubEnv('AGENT_BASE_URL', 'http://localhost:8080');
    expect(createAgentClient()).toBeInstanceOf(HttpAgentClient);
  });

  it('uses default AGENT_BASE_URL when not set', () => {
    vi.stubEnv('AGENT_MODE', 'http');
    vi.stubEnv('AGENT_BASE_URL', '');
    const client = createAgentClient();
    expect(client).toBeInstanceOf(HttpAgentClient);
  });
});
