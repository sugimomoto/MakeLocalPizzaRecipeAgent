import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import importPlugin from 'eslint-plugin-import';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'dist/**',
      'coverage/**',
      'next-env.d.ts',
      'src/data/ingredients.generated.json',
      'pnpm-lock.yaml',
      // E2E アーティファクト (Playwright ブラウザ・テスト結果)
      '.cache/**',
      'test-results/**',
      'playwright-report/**',
      // 非ソース領域 (参照/設定/ドキュメント)
      'design/**',
      'docs/**',
      '.steering/**',
      '.claude/**',
      '.devcontainer/**',
      // _reference/ は別プロジェクトの clone (gitignore 済)。lint 対象外
      '_reference/**',
      '.github/**',
      'public/**',
      // Python サイド (Slice 2 以降)
      'agent/**',
    ],
  },

  ...nextCoreWebVitals,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx,mjs,js}'],
    plugins: {
      import: importPlugin,
    },
    rules: {
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index'], 'type'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src/domain',
              from: ['./src/lib', './src/stores', './src/components', './src/hooks', './app'],
              message: 'domain layer は他層に依存禁止 (repository-structure.md §6)',
            },
            {
              target: './src/lib',
              from: ['./app', './src/components', './src/hooks', './src/stores'],
              message: 'lib layer は上位層に依存禁止 (repository-structure.md §6)',
            },
          ],
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // 本番コードに console.log を残さない (warn/error は許容)
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },

  // logger は console を「sink」として正規に使うため、no-console を無効化
  {
    files: ['src/lib/observability/logger.ts'],
    rules: { 'no-console': 'off' },
  },

  // CLI スクリプト (scripts/) は標準出力で進捗を出すため console.log を許容
  {
    files: ['scripts/**/*.{ts,mjs,js}'],
    rules: { 'no-console': 'off' },
  },

  // テストファイルは debug 出力で console.log/info を使うことがある
  {
    files: ['**/*.{test,spec}.{ts,tsx,js,mjs}', 'tests/**/*.{ts,tsx}'],
    rules: { 'no-console': 'off' },
  },
);
