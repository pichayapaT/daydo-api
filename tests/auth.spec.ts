import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { cleanupUser, origin } from './fixtures';

test('register, logout, incorrect password and login restore the same account', async ({ page }) => {
  const email = `${randomUUID()}@example.test`;
  let id = '';
  try {
    await page.goto('/');
    await page.getByRole('button', { name: 'ยังไม่มีบัญชี สมัครสมาชิก' }).click();
    await page.getByLabel('ชื่อที่แสดง').fill('เจ้าของบัญชี');
    await page.getByLabel('อีเมล').fill(email);
    await page.getByLabel('รหัสผ่าน', { exact: true }).fill('Test-password-2026!');
    await page.getByLabel('ยืนยันรหัสผ่าน').fill('Test-password-2026!');
    await page.getByRole('button', { name: 'สมัครสมาชิก', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'วันนี้ของคุณ' })).toBeVisible();
    id = (await (await page.request.get('/api/auth/me')).json()).user.id;
    const cookie = (await page.context().cookies()).find(cookie => cookie.name === 'day_by_day_session');
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe('Strict');
    await page.getByRole('button', { name: 'ออกจากระบบ' }).click();
    await expect(page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true })).toBeVisible();
    expect((await page.request.get('/api/data')).status()).toBe(401);
    await page.getByLabel('อีเมลหรือชื่อผู้ใช้').fill(email);
    await page.getByLabel('รหัสผ่าน', { exact: true }).fill('Wrong-password-123');
    await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
    await expect(page.locator('main').getByRole('alert')).toContainText('อีเมล ชื่อผู้ใช้ หรือรหัสผ่านไม่ถูกต้อง');
    await page.getByLabel('รหัสผ่าน', { exact: true }).fill('Test-password-2026!');
    await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'วันนี้ของคุณ' })).toBeVisible();
    expect((await (await page.request.get('/api/auth/me')).json()).user.id).toBe(id);
    await page.locator('.sidebar nav').getByRole('button', { name: 'บัญชี', exact: true }).click();
    const username = `u_${id.replace(/-/g, '').slice(0, 10)}`;
    await page.getByLabel('ตั้งชื่อผู้ใช้สำหรับเข้าสู่ระบบ').fill(username);
    await page.getByRole('button', { name: 'บันทึกชื่อผู้ใช้', exact: true }).click();
    await expect(page.getByText(`@${username}`)).toBeVisible();
    await page.getByLabel('รหัสผ่านปัจจุบัน').fill('Test-password-2026!');
    await page.getByLabel('รหัสผ่านใหม่', { exact: true }).fill('New-password-2026!');
    await page.getByLabel('ยืนยันรหัสผ่านใหม่').fill('New-password-2026!');
    await page.getByRole('button', { name: 'เปลี่ยนรหัสผ่าน', exact: true }).click();
    await expect(page.getByText('เปลี่ยนรหัสผ่านแล้ว')).toBeVisible();
    await page.getByRole('button', { name: 'ออกจากระบบ' }).click();
    await page.getByLabel('อีเมลหรือชื่อผู้ใช้').fill(username);
    await page.getByLabel('รหัสผ่าน', { exact: true }).fill('New-password-2026!');
    await page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'วันนี้ของคุณ' })).toBeVisible();
  } finally { if (id) await cleanupUser(id); }
});

test('API isolates accounts, rejects stale writes and validates ownership and input', async ({ playwright, baseURL }) => {
  const contexts = await Promise.all([1,2].map(() => playwright.request.newContext({ baseURL, extraHTTPHeaders: { Origin: origin } })));
  const ids: string[] = [];
  try {
    for (const context of contexts) {
      const result = await context.post('/api/auth/register', { data: { name: 'API test', email: `${randomUUID()}@example.test`, password: 'Test-password-2026!' } });
      expect(result.status()).toBe(201);
      ids.push((await result.json()).user.id);
    }
    const [a,b] = contexts;
    const taskId = randomUUID();
    const habitId = randomUUID();
    const initial = await (await a.get('/api/data')).json();
    const data = { ...initial, tasks: [{ id: taskId, title: 'Private task', detail: '', date: '2026-09-30', priority: 'medium', done: false, dueDate: '2026-10-02', time: '10:00', important: null, urgent: null, checklist: [{id: randomUUID(),title:'Private step',done:false}] }], habits: [{ id: habitId, name: 'Private habit', icon: 'book', color: 'mint', days: [1], time: 'เช้า', active: true, created: '2026-01-01' }], checks: [{ habitId, date: '2026-09-30', status: 'done', note: 'Private note' }] };
    expect((await a.put('/api/data', { data })).status()).toBe(200);
    expect((await a.put('/api/data', { headers: { 'X-Account-Id': ids[1] }, data: { ...data, revision: 1 } })).status()).toBe(401);
    const own = await (await a.get('/api/data')).json();
    expect(own.tasks).toEqual(data.tasks);
    expect(own.habits).toEqual(data.habits);
    expect(own.checks).toEqual(data.checks);
    expect(await (await b.get(`/api/data?userId=${ids[0]}`)).json()).toEqual(initial);
    expect((await b.put('/api/data', { data: { ...data, userId: ids[0] } })).status()).toBe(400);
    // Even reusing another user's record IDs only affects the caller's own namespace.
    expect((await b.put('/api/data', { data: { ...data, tasks: [{ ...data.tasks[0], title: 'Other user' }] } })).status()).toBe(200);
    expect((await (await a.get('/api/data')).json()).tasks[0].title).toBe('Private task');
    expect((await a.put('/api/data', { data })).status()).toBe(409);
    expect((await a.put('/api/data', { data: {...own,version:1} })).status()).toBe(409);
    expect((await (await a.get('/api/data')).json()).tasks[0].checklist).toEqual(data.tasks[0].checklist);
    expect((await a.put('/api/data', { data: { ...own, tasks: [{ ...data.tasks[0], date: '2026-02-30' }] } })).status()).toBe(400);
    expect((await a.put('/api/data', { data: { ...own, checks: [{ ...data.checks[0], habitId: randomUUID() }] } })).status()).toBe(400);
    expect((await a.put('/api/data', { headers: { Origin: 'https://untrusted.example' }, data: own })).status()).toBe(403);
    expect(await (await a.get('/api/data')).json()).toEqual(own);
    const cookies = await a.storageState();
    expect((await a.post('/api/auth/logout')).status()).toBe(200);
    const revoked = await playwright.request.newContext({ baseURL, storageState: cookies });
    try { expect((await revoked.get('/api/data')).status()).toBe(401); }
    finally { await revoked.dispose(); }
  } finally {
    await Promise.all(ids.map(cleanupUser));
    await Promise.all(contexts.map(context => context.dispose()));
  }
});
