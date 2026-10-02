import { defineConfig } from '@playwright/test';
import config from './playwright.config';
export default defineConfig({
  ...config, testMatch: '**/auth.spec.ts', grep: /API isolates/,
  use: { baseURL: process.env.E2E_API_BASE_URL || `http://127.0.0.1:${process.env.API_PORT || 3001}` },
});
