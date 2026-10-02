import 'dotenv/config';
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: '**/*.spec.ts', timeout: 45000, workers: 1,
  use: { baseURL: process.env.E2E_BASE_URL || process.env.APP_ORIGIN || 'http://localhost:3000', headless: true },
});
