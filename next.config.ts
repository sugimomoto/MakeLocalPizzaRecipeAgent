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
    // Slice 9: Firebase Admin SDK は Node 専用 (gRPC / firestore-node) 依存のため
    // webpack バンドル対象から外し、Node 実行時 require で解決させる。
    'firebase-admin',
    '@google-cloud/firestore',
  ],
  /**
   * 2026-06: 独自ドメイン furusato-pizza.jp を本番運用 URL として導入。
   * 旧 Cloud Run のデフォルト URL (mlpr-web-...run.app) にアクセスされた場合は
   * 301 で furusato-pizza.jp にリダイレクトすることで:
   *   - SEO: 検索エンジンが新ドメインを正規 URL として認識
   *   - UX: ブックマーク等の旧 URL アクセス者を自動誘導
   *   - 検証: Cloud Run の URL からのアクセスは将来的に減らす
   *
   * `permanent: true` = 301 (恒久的)。後で運用方針を変えるときは慎重に
   * (検索エンジンのキャッシュが残る)。
   */
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'mlpr-web-343527548585.asia-northeast1.run.app',
          },
        ],
        destination: 'https://furusato-pizza.jp/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
