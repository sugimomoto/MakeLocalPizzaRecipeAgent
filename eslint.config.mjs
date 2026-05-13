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
      // 非ソース領域 (参照/設定/ドキュメント)
      'design/**',
      'docs/**',
      '.steering/**',
      '.claude/**',
      '.devcontainer/**',
      '.github/**',
      'public/**',
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
    },
  },
);
