import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { createConnection } from 'mysql2/promise';
import { test as base, expect } from '@playwright/test';

export const origin = process.env.APP_ORIGIN || 'http://localhost:3000';
export async function cleanupUser(id: string) {
  const db = await createConnection({ host: process.env.MYSQL_HOST, port: Number(process.env.MYSQL_PORT || 3307), user: process.env.MYSQL_USER, password: process.env.MYSQL_PASSWORD, database: process.env.MYSQL_DATABASE });
  try { await db.execute("DELETE FROM users WHERE id = ? AND email LIKE '%@example.test'", [id]); }
  finally { await db.end(); }
}
export const test = base.extend({
  page: async ({ page }, run) => {
    const response = await page.request.post('/api/auth/register', { headers: { Origin: origin }, data: { name: 'ผู้ทดสอบ', email: `${randomUUID()}@example.test`, password: 'Test-password-2026!' } });
    expect(response.status()).toBe(201);
    const { user } = await response.json();
    try { await run(page); } finally { await cleanupUser(user.id); }
  },
});
export { expect };
