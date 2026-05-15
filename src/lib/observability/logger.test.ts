import { describe, expect, it, vi } from 'vitest';

import { createLogger } from './logger';

import type { LogRecord } from './logger';

function makeCapture() {
  const records: LogRecord[] = [];
  return { records, sink: (r: LogRecord) => records.push(r) };
}

describe('createLogger', () => {
  it('emits a JSON record with severity, message, timestamp, baseContext, and per-call context', () => {
    const { records, sink } = makeCapture();
    const fixedNow = new Date('2026-05-15T00:00:00.000Z');
    const log = createLogger({
      minLevel: 'debug',
      sink,
      now: () => fixedNow,
      baseContext: { service: 'mlpr-test' },
    });
    log.info('hello', { userId: 'u1' });
    expect(records).toHaveLength(1);
    expect(records[0]).toEqual({
      severity: 'INFO',
      message: 'hello',
      timestamp: '2026-05-15T00:00:00.000Z',
      service: 'mlpr-test',
      userId: 'u1',
    });
  });

  it('maps each level to its Cloud Logging severity', () => {
    const { records, sink } = makeCapture();
    const log = createLogger({ minLevel: 'debug', sink });
    log.debug('d');
    log.info('i');
    log.warn('w');
    log.error('e');
    expect(records.map((r) => r.severity)).toEqual(['DEBUG', 'INFO', 'WARNING', 'ERROR']);
  });

  it('drops records below minLevel', () => {
    const { records, sink } = makeCapture();
    const log = createLogger({ minLevel: 'warn', sink });
    log.debug('debug-msg');
    log.info('info-msg');
    log.warn('warn-msg');
    log.error('error-msg');
    expect(records.map((r) => r.message)).toEqual(['warn-msg', 'error-msg']);
  });

  it('child(...) merges extra context onto baseContext', () => {
    const { records, sink } = makeCapture();
    const log = createLogger({
      minLevel: 'debug',
      sink,
      baseContext: { service: 'mlpr-test' },
    });
    const child = log.child({ requestId: 'req-1' });
    child.info('child-msg', { extra: 1 });
    expect(records[0]).toMatchObject({
      service: 'mlpr-test',
      requestId: 'req-1',
      extra: 1,
      message: 'child-msg',
    });
  });

  it('per-call context overrides baseContext on key collision', () => {
    const { records, sink } = makeCapture();
    const log = createLogger({ minLevel: 'debug', sink, baseContext: { service: 'a' } });
    log.info('m', { service: 'b' });
    expect(records[0]?.service).toBe('b');
  });

  it('default sink writes JSON via console.error for ERROR severity', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const log = createLogger({ minLevel: 'debug', baseContext: { service: 'x' } });
    log.error('boom', { code: 'X' });
    expect(errSpy).toHaveBeenCalledTimes(1);
    const arg = String(errSpy.mock.calls[0]?.[0] ?? '');
    const parsed = JSON.parse(arg);
    expect(parsed).toMatchObject({ severity: 'ERROR', message: 'boom', code: 'X' });
    errSpy.mockRestore();
  });
});
