import { test, expect, origin } from './fixtures';

test('a revoked session returns to login without retaining the account dashboard', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'ลองข้อมูลตัวอย่าง' })).toBeVisible();
  await page.request.post('/api/auth/logout', { headers: { Origin: origin } });
  await page.getByRole('button', { name: 'ลองข้อมูลตัวอย่าง' }).click();
  await expect(page.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'วันนี้ของคุณ' })).toHaveCount(0);
  await expect(page.locator('main').getByRole('alert')).toContainText('เซสชันหมดอายุ');
});

test('failed saves retain the form and can be retried', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'เพิ่มงาน', exact: true }).click();
  await page.getByLabel('ชื่องาน').fill('งานที่ต้องลองบันทึกใหม่');
  await page.route('**/api/data', route => route.request().method() === 'PUT' ? route.fulfill({ status: 503, json: { message: 'unavailable' } }) : route.continue());
  await page.getByRole('button', { name: 'บันทึก', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('เซิร์ฟเวอร์ไม่พร้อมใช้งาน');
  await expect(page.getByLabel('ชื่องาน')).toHaveValue('งานที่ต้องลองบันทึกใหม่');
  await page.unroute('**/api/data');
  await page.getByRole('button', { name: 'บันทึก', exact: true }).click();
  await expect(page.locator('dialog')).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('งานที่ต้องลองบันทึกใหม่', { exact: true })).toBeVisible();
});

test('a stale tab cannot overwrite changes and can reload before retrying', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'วันนี้ของคุณ' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'เพิ่มงาน', exact: true })).toBeVisible();
  const data = await (await page.request.get('/api/data')).json();
  expect((await page.request.put('/api/data', { headers: { Origin: origin }, data })).ok()).toBe(true);
  await page.getByRole('button', { name: 'ลองข้อมูลตัวอย่าง' }).click();
  await expect(page.locator('main').getByRole('alert')).toContainText('ข้อมูลเปลี่ยนจากอีกหน้าต่าง');
  await page.getByRole('button', { name: 'โหลดข้อมูลล่าสุด' }).click();
  await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'ลองข้อมูลตัวอย่าง' }).click();
  await expect(page.getByText('จัดโต๊ะทำงานให้พร้อม', { exact: true })).toBeVisible();
});
