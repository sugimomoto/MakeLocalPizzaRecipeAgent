import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  poweredByHeader: false,
  typedRoutes: true,
  /**
   * OpenTelemetry / @grpc/grpc-js / require-in-the-middle 等は Node 専用で
   * webpack バンドル対象にすべきでない。Next.js 16 webpack dev mode は
   * instrumentation.ts 内の動的 import (await import('@opentelemetry/...')) を
   * バンドル対象に含めようとして "Module not found: Can't resolve 'stream'" で
   * 失敗するため、Cloud Run 上で必要な OTel パッケージ群を外部化する。
   *
   * 本番ビルドでは Node runtime としてそのまま require され、Cloud Run 上で
   * @grpc/grpc-js が Node 標準モジュール (stream / worker_threads) を解決する。
   */
  serverExternalPackages: [
    '@opentelemetry/sdk-node',
    '@opentelemetry/auto-instrumentations-node',
    '@opentelemetry/instrumentation',
    '@google-cloud/opentelemetry-cloud-trace-exporter',
    '@grpc/grpc-js',
    'require-in-the-middle',
  ],
};

export default nextConfig;
