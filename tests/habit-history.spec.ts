import { test, expect } from './fixtures';

test('month and year history preserve paused habits, notes and leap-day records', async ({ page }) => {
  await page.clock.install({ time: new Date('2024-03-15T12:00:00+07:00') });
  const habitId = 'b3a382cd-b004-456b-9c71-d78c017c9e35';
  const seeded = await page.request.put('/api/data', { headers: { Origin: process.env.APP_ORIGIN || 'http://localhost:3000' }, data: { version: 2, revision: 0, tasks: [], habits: [{ id: habitId, name: 'อ่านหนังสือย้อนหลัง', icon: 'book', color: 'lavender', days: [1], time: 'เย็น', active: false, created: '2023-01-01' }], checks: [
    { habitId, date: '2024-02-29', status: 'done', note: '' },
    { habitId, date: '2024-02-14', status: 'skip', note: 'พักสายตา' },
    { habitId, date: '2024-03-01', status: 'done', note: '' },
    { habitId, date: '2023-12-31', status: 'done', note: '' },
  ] }});
  expect(seeded.ok()).toBe(true);
  await page.goto('/');
  await page.locator('.sidebar nav').getByRole('button', { name: 'กิจวัตร', exact: true }).click();
  await page.getByRole('button', { name: 'เดือน', exact: true }).click();
  await expect(page.locator('.history-period-controls')).toContainText('มีนาคม 2567');
  await page.getByRole('button', { name: 'เดือนก่อนหน้า', exact: true }).click();
  await expect(page.locator('.habit-month-day')).toHaveCount(29);
  await expect(page.locator('.habit-history-totals')).toContainText('ทำแล้ว 1 วัน');
  await expect(page.locator('.habit-history-totals')).toContainText('ข้าม 1 วัน');
  await page.getByRole('button', { name: '14 กุมภาพันธ์ 2567: ข้าม', exact: true }).click();
  await expect(page.locator('.habit-history-detail')).toContainText('พักสายตา');
  await page.getByRole('button', { name: '29 กุมภาพันธ์ 2567: ทำแล้ว', exact: true }).click();
  await expect(page.locator('.habit-history-detail')).toContainText('ทำแล้ว');
  await page.getByRole('button', { name: 'ปี', exact: true }).click();
  await expect(page.locator('.habit-year-month')).toHaveCount(12);
  await expect(page.locator('.habit-history-totals')).toContainText('ทำแล้ว 2 วัน');
  await page.getByRole('button', { name: 'ปีก่อนหน้า', exact: true }).click();
  await expect(page.locator('.history-period-controls')).toContainText('2566');
  await expect(page.locator('.habit-history-totals')).toContainText('ทำแล้ว 1 วัน');
  await page.getByRole('button', { name: 'ปีถัดไป', exact: true }).click();
  await page.getByRole('button', { name: 'ดูธันวาคม 2567', exact: true }).click();
  await expect(page.getByRole('button', { name: 'เดือน', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.habit-month-day')).toHaveCount(31);
  await expect(page.getByText('ยังไม่มีประวัติในเดือนนี้')).toBeVisible();
  await page.getByRole('button', { name: 'เดือนถัดไป', exact: true }).click();
  await expect(page.locator('.history-period-controls')).toContainText('มกราคม 2568');
  await page.getByRole('button', { name: 'เดือนนี้', exact: true }).click();
  await expect(page.locator('.history-period-controls')).toContainText('มีนาคม 2567');
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const name of ['เดือน', 'ปี']) {
      await page.getByRole('button', { name, exact: true }).click();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
  await page.getByRole('button', { name: 'ปีนี้', exact: true }).click();
  await page.reload();
  const saved = await (await page.request.get('/api/data')).json();
  expect(saved.checks).toHaveLength(4);
  expect(saved.habits[0].active).toBe(false);
});
