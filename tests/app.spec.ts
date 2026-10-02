import { test, expect } from './fixtures';
test('daily workflow persists tasks, independent habit history and calendar',async({page})=>{
 await page.goto('/');await expect(page.getByRole('heading',{name:'วันนี้ของคุณ'})).toBeVisible();
 await page.getByRole('button',{name:'เพิ่มงาน',exact:true}).click();
 await page.getByRole('button',{name:'บันทึก',exact:true}).click();await expect(page.getByLabel('ชื่องาน')).toBeFocused();
 await page.getByLabel('ชื่องาน').fill('ทดสอบงานประจำวัน');await page.getByLabel('รายละเอียด').fill('รายละเอียดทดสอบ');await page.getByRole('button',{name:'บันทึก',exact:true}).click();
 await expect(page.getByText('ทดสอบงานประจำวัน',{exact:true})).toBeVisible();await page.getByRole('button',{name:'ทำเสร็จ ทดสอบงานประจำวัน',exact:true}).click();
 await page.reload();await expect(page.getByRole('button',{name:'ยกเลิกการทำเสร็จ ทดสอบงานประจำวัน',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'แก้ไขหรือเลื่อนงาน ทดสอบงานประจำวัน'}).click();await page.getByLabel('ชื่องาน').fill('งานแก้ไขแล้ว');await page.getByRole('button',{name:'บันทึก',exact:true}).click();
 await page.getByRole('button',{name:'ยกเลิกการทำเสร็จ งานแก้ไขแล้ว',exact:true}).click();
 await page.getByRole('button',{name:'วันถัดไป',exact:true}).click();await expect(page.locator('.overdue-label')).toBeVisible();await expect(page.getByText('งานแก้ไขแล้ว',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'วันนี้',exact:true}).last().click();
 await page.getByRole('button',{name:'เพิ่มกิจวัตร',exact:true}).click();await page.getByLabel('ชื่อกิจวัตร').fill('อ่านหนังสือทดสอบ');await page.getByRole('button',{name:'บันทึก',exact:true}).click();
 await page.getByRole('button',{name:'เช็กกิจวัตร อ่านหนังสือทดสอบ'}).click();await expect(page.getByText('ทำแล้ว',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'วันถัดไป',exact:true}).click();await expect(page.getByRole('button',{name:'เช็กกิจวัตร อ่านหนังสือทดสอบ'})).toHaveAttribute('aria-pressed','false');
 await page.getByRole('button',{name:'ข้ามวันนี้ อ่านหนังสือทดสอบ'}).click();await page.getByLabel('หมายเหตุ').fill('พักก่อน');await page.getByRole('button',{name:'ข้ามวันนี้',exact:true}).click();await expect(page.getByText('ข้ามวันนี้ · พักก่อน')).toBeVisible();
 await page.getByRole('button',{name:'วันก่อนหน้า',exact:true}).click();await expect(page.getByRole('button',{name:'เช็กกิจวัตร อ่านหนังสือทดสอบ'})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'กิจวัตร',exact:true}).first().click();await page.getByRole('button',{name:'พักใช้งาน',exact:true}).click();await expect(page.getByText('พักใช้งาน · ไม่ระบุเวลา')).toBeVisible();await expect(page.locator('.history-grid .mint')).toHaveCount(1);await page.getByRole('button',{name:'เปิดใช้งาน',exact:true}).click();
 await page.getByRole('button',{name:'วันนี้',exact:true}).first().click();
 await page.getByRole('group',{name:'มุมมองวันนี้'}).getByRole('button',{name:'ปฏิทิน',exact:true}).click();
 const month=await page.locator('.calendar-panel h2').textContent();await page.getByRole('button',{name:'เดือนถัดไป'}).click();await expect(page.locator('.calendar-panel h2')).not.toHaveText(month!);await page.getByRole('button',{name:'เดือนก่อนหน้า'}).click();await expect(page.locator('.calendar-panel h2')).toHaveText(month!);
 await page.locator('.calendar-day').first().click();await expect(page.locator('.calendar-day').first()).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'กลับมาวันนี้'}).click();await page.getByRole('button',{name:'ลบงาน งานแก้ไขแล้ว'}).click();await page.getByRole('button',{name:'เก็บไว้ก่อน'}).click();await expect(page.getByText('งานแก้ไขแล้ว',{exact:true})).toBeVisible();await page.getByRole('button',{name:'ลบงาน งานแก้ไขแล้ว'}).click();await page.getByRole('button',{name:'ยืนยันการลบ'}).click();await page.reload();await expect(page.getByText('งานแก้ไขแล้ว',{exact:true})).toHaveCount(0);
});
test('360px layouts, sample data and forms never overflow',async({page})=>{
 await page.setViewportSize({width:360,height:800});await page.goto('/');await page.getByRole('button',{name:'ลองข้อมูลตัวอย่าง'}).click();
 for(const name of ['วันนี้','กิจวัตร','จดด่วน']){await page.locator('.bottom-nav').getByRole('button',{name,exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.locator('.bottom-nav').getByRole('button',{name:'วันนี้',exact:true}).click();
 await page.getByRole('group',{name:'มุมมองวันนี้'}).getByRole('button',{name:'ปฏิทิน',exact:true}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('.bottom-nav').getByRole('button',{name:'วันนี้',exact:true}).click();await page.screenshot({path:'test-results/mobile.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1050});await page.screenshot({path:'test-results/desktop.png',fullPage:true});
});
test('rescheduling, editing a weekly habit, preserving real data and responsive widths',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'เพิ่มงาน',exact:true}).click();await page.getByLabel('ชื่องาน').fill('ข้อมูลจริง');await page.getByRole('button',{name:'บันทึก',exact:true}).click();
 await page.getByRole('button',{name:'วันถัดไป',exact:true}).click();const tomorrow=await page.getByLabel('วันที่เลือก').inputValue();await page.getByRole('button',{name:'แก้ไขหรือเลื่อนงาน ข้อมูลจริง'}).click();await page.locator('dialog').getByLabel('วันที่วางแผนทำ').fill(tomorrow);await page.getByRole('button',{name:'บันทึก',exact:true}).click();await expect(page.locator('.overdue-label')).toHaveCount(0);await expect(page.getByText('ข้อมูลจริง',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'ลองข้อมูลตัวอย่าง'}).click();await expect(page.getByText('ข้อมูลจริง',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'กิจวัตร',exact:true}).first().click();await page.getByRole('button',{name:'แก้ไขกิจวัตร อ่านหนังสือ'}).click();await page.getByLabel('ชื่อกิจวัตร').fill('อ่านเฉพาะวันจันทร์');await page.getByRole('button',{name:'ยกเลิกเลือกทุกวัน'}).click();await page.getByRole('button',{name:'จ.',exact:true}).click();await page.getByLabel('เวลา').fill('07:00');await page.getByRole('button',{name:'บันทึก',exact:true}).click();await expect(page.getByText('อ่านเฉพาะวันจันทร์',{exact:true})).toBeVisible();await expect(page.locator('.habit-card').filter({hasText:'อ่านเฉพาะวันจันทร์'}).locator('.schedule-label')).toHaveText('จ.');
 for(const width of [360,700,768,1024,1440]){await page.setViewportSize({width,height:900});for(const name of ['วันนี้','กิจวัตร','จดด่วน']){const nav=page.locator(width<=700?'.bottom-nav':'.sidebar nav');await nav.getByRole('button',{name,exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name} at ${width}px`).toBe(true);}await page.locator(width<=700?'.bottom-nav':'.sidebar nav').getByRole('button',{name:'วันนี้',exact:true}).click();await page.getByRole('group',{name:'มุมมองวันนี้'}).getByRole('button',{name:'ปฏิทิน',exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`ปฏิทิน at ${width}px`).toBe(true);}
});
test('obsolete local data is cleared and food features are absent',async({page})=>{
 await page.addInitScript(()=>localStorage.setItem('day-by-day:v1',JSON.stringify({version:1,tasks:[{title:'งานเดิม'}]})));
 await page.goto('/');await expect(page.getByRole('heading',{name:'วันนี้ของคุณ'})).toBeVisible();
 await expect(page.getByText('งานเดิม',{exact:true})).toHaveCount(0);
 expect(await page.evaluate(()=>localStorage.getItem('day-by-day:v1'))).toBeNull();
 await expect(page.locator('.sidebar nav button')).toHaveCount(5);
 await expect(page.locator('.stats-grid .stat')).toHaveCount(2);
 for(const name of ['วันนี้','กิจวัตร','จดด่วน']){await page.locator('.sidebar nav').getByRole('button',{name,exact:true}).click();await expect(page.locator('main')).not.toContainText(/อาหาร|แคล|โภชนาการ|เมนูประจำ/);}
 await page.locator('.sidebar nav').getByRole('button',{name:'วันนี้',exact:true}).click();
 await page.getByRole('group',{name:'มุมมองวันนี้'}).getByRole('button',{name:'ปฏิทิน',exact:true}).click();
 await expect(page.locator('main')).not.toContainText(/อาหาร|แคล|โภชนาการ|เมนูประจำ/);
});
