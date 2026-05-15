/**
 * 構造化ロガー (Slice 1: console JSON 出力)
 *
 * - JSON 1 行 / 1 ログ。Cloud Logging が自動で field を取り込めるフォーマットに準拠
 * - severity フィールドで Cloud Logging の重大度に対応 (DEBUG/INFO/WARNING/ERROR)
 * - context (任意) は構造化フィールドとしてマージ
 * - Slice 6 で OpenTelemetry / trace_id 連携に差し替える前提
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const SEVERITY_MAP: Record<LogLevel, string> = {
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARNING',
  error: 'ERROR',
};

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export type LogContext = Record<string, unknown>;

export type LogRecord = {
  severity: string;
  message: string;
  timestamp: string;
  [key: string]: unknown;
};

export type Logger = {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, context?: LogContext) => void;
  child: (extraContext: LogContext) => Logger;
};

export type LoggerOptions = {
  minLevel?: LogLevel;
  baseContext?: LogContext;
  /** テスト・差し替え用。未指定時は console を選択。 */
  sink?: (record: LogRecord) => void;
  /** 時刻取得を上書き (テスト用)。 */
  now?: () => Date;
};

function defaultSink(record: LogRecord): void {
  const line = JSON.stringify(record);
  if (record.severity === 'ERROR') {
    console.error(line);
  } else if (record.severity === 'WARNING') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const minLevel = options.minLevel ?? 'info';
  const minPriority = LEVEL_PRIORITY[minLevel];
  const sink = options.sink ?? defaultSink;
  const now = options.now ?? (() => new Date());
  const baseContext = options.baseContext ?? {};

  function emit(level: LogLevel, message: string, context?: LogContext): void {
    if (LEVEL_PRIORITY[level] < minPriority) return;
    const record: LogRecord = {
      severity: SEVERITY_MAP[level],
      message,
      timestamp: now().toISOString(),
      ...baseContext,
      ...(context ?? {}),
    };
    sink(record);
  }

  return {
    debug: (message, context) => emit('debug', message, context),
    info: (message, context) => emit('info', message, context),
    warn: (message, context) => emit('warn', message, context),
    error: (message, context) => emit('error', message, context),
    child: (extraContext) =>
      createLogger({
        ...options,
        baseContext: { ...baseContext, ...extraContext },
      }),
  };
}

/** プロセス全体で共有するデフォルトロガー。 */
export const logger: Logger = createLogger({
  minLevel: (process.env.LOG_LEVEL as LogLevel | undefined) ?? 'info',
  baseContext: {
    service: 'mlpr-web',
  },
});
