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
 * 注: SDK を node-only モジュールに閉じ込めるため `nextRuntime` で
 * "nodejs" のみ実体を import する。
 */
export async function register(): Promise<void> {
  // K_SERVICE は Cloud Run が自動付与する env。dev/test では undefined。
  if (!process.env.K_SERVICE) return;
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // 動的 import で edge bundle に sdk-node を含めない。
  const { NodeSDK } = await import('@opentelemetry/sdk-node');
  const { TraceExporter } = await import('@google-cloud/opentelemetry-cloud-trace-exporter');
  const { getNodeAutoInstrumentations } = await import('@opentelemetry/auto-instrumentations-node');

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
