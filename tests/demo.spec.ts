import { test, expect } from '@playwright/test';

test('demo works without API, supports edits and resets on refresh', async ({ page }) => {
  const requests: string[] = [];
  await page.route('**/api/**', route => {
    requests.push(route.request().url());
    return route.abort();
  });
  await page.goto('/');
  await page.getByRole('link', { name: 'ลองใช้ Demo' }).click();
  await expect(page.getByText('วางแผนสัปดาห์นี้แบบสบาย ๆ', { exact: true })).toBeVisible();
  requests.length = 0;
  await page.reload();
  await page.getByRole('button', { name: 'เพิ่มงาน', exact: true }).click();
  await page.getByLabel('ชื่องาน').fill('งานทดลอง');
  await page.getByRole('button', { name: 'บันทึก', exact: true }).click();
  await page.getByRole('button', { name: 'ทำเสร็จ งานทดลอง', exact: true }).click();
  await expect(page.getByRole('button', { name: 'ยกเลิกการทำเสร็จ งานทดลอง', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'เช็กกิจวัตร อ่านหนังสือ' }).click();
  await expect(page.getByRole('button', { name: 'เช็กกิจวัตร อ่านหนังสือ' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'ลบงาน จัดโต๊ะทำงานให้พร้อม' }).click();
  await page.getByRole('button', { name: 'ยืนยันการลบ' }).click();
  await expect(page.getByText('จัดโต๊ะทำงานให้พร้อม', { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('จัดโต๊ะทำงานให้พร้อม', { exact: true })).toBeVisible();
  await expect(page.getByText('งานทดลอง', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'เช็กกิจวัตร อ่านหนังสือ' })).toHaveAttribute('aria-pressed', 'false');
  await page.setViewportSize({ width: 360, height: 800 });
  for (const name of ['วันนี้', 'กิจวัตร', 'จดด่วน']) {
    await page.locator('.bottom-nav').getByRole('button', { name, exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.locator('.bottom-nav').getByRole('button', { name: 'วันนี้', exact: true }).click();
  await page.getByRole('group', { name: 'มุมมองวันนี้' }).getByRole('button', { name: 'ปฏิทิน', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(requests).toEqual([]);
  await page.getByRole('button', { name: 'ออกจาก Demo' }).click();
  await expect(page).toHaveURL(/\/$/);
});
