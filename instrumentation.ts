/**
 * Next.js instrumentation hook — Cloud Run 上でだけ OpenTelemetry を起動する。
 *
 * - Cloud Run 判定: `process.env.K_SERVICE` が付与されているかで分岐
 * - dev / test では no-op (ローカルで Cloud Trace 課金しない)
 * - Edge / browser runtime では走らせない (Node runtime のみ)
 *
 * 期待動作:
 * - HTTP outgoing fetch に W3C Trace Context (`traceparent` ヘッダ) を伝播
 *   → Agent 側 (Python OTel) と親子 span が繋がる
 * - すべての span を Cloud Trace に export
 *
 * 実装メモ (Slice 8.1):
 * - OTel パッケージ群 (@grpc/grpc-js / node-fetch / node-domexception 等) は
 *   Node 専用モジュール (`stream`, `worker_threads`) に依存し、Next.js 16 の
 *   webpack dev mode はそれらを解決できず "Module not found" で 500 になる。
 * - 静的 import / 通常の動的 import だと webpack が依然バンドルしようとするため、
 *   `webpackIgnore: true` マジックコメントで完全にバンドル対象から外す。
 *   実行時は Node の native require / dynamic import で解決される (本番のみ走るので
 *   その時は実体が node_modules に存在する)。
 */
export async function register(): Promise<void> {
  // K_SERVICE は Cloud Run が自動付与する env。dev/test では undefined。
  if (!process.env.K_SERVICE) return;
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  // 二重ガード: 本番モード以外では絶対に走らせない (誤動作回避)
  if (process.env.NODE_ENV !== 'production') return;

  // webpackIgnore でバンドル対象から完全に外し、Node 実行時 require で解決させる。
  const { NodeSDK } = await import(/* webpackIgnore: true */ '@opentelemetry/sdk-node');
  const { TraceExporter } = await import(
    /* webpackIgnore: true */ '@google-cloud/opentelemetry-cloud-trace-exporter'
  );
  const { getNodeAutoInstrumentations } = await import(
    /* webpackIgnore: true */ '@opentelemetry/auto-instrumentations-node'
  );

  const sdk = new NodeSDK({
    traceExporter: new TraceExporter(),
    instrumentations: [
      getNodeAutoInstrumentations({
        // fs / net 等の noisy instrumentation を抑制
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-net': { enabled: false },
        '@opentelemetry/instrumentation-dns': { enabled: false },
      }),
    ],
  });

  sdk.start();

  // 終了時に flush (Cloud Run の SIGTERM で span を取りこぼさないように)
  process.on('SIGTERM', () => {
    void sdk.shutdown();
  });
}
