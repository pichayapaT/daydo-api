import js from '@eslint/js';
import parser from '@typescript-eslint/parser';
import ts from '@typescript-eslint/eslint-plugin';

export default [
  { ignores: ['node_modules/**', 'dist/**', '.playwright/**', 'test-results/**', 'playwright-report/**'] },
  {
    files: ['**/*.ts'],
    languageOptions: { parser, parserOptions: { ecmaVersion: 'latest', sourceType: 'module' } },
    plugins: { '@typescript-eslint': ts },
    rules: { ...js.configs.recommended.rules, ...ts.configs.recommended.rules, 'no-undef': 'off' },
  },
];
