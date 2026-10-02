import { test as browserTest, type Page } from '@playwright/test';
import { test, expect } from './fixtures';

async function workflow(page:Page, demo:boolean) {
 await page.clock.install({time:new Date('2026-09-30T12:00:00+07:00')});
 await page.goto(demo?'/demo':'/');
 const nav=(name:string)=>page.locator('.sidebar nav').getByRole('button',{name,exact:true}).click();
 await nav('จดด่วน');
 await page.getByLabel('จดงานไว้ก่อน').fill('งานจาก Inbox');
 await page.getByRole('button',{name:'เก็บงาน',exact:true}).click();
 const row=()=>page.locator('.task-row').filter({has:page.getByRole('button',{name:'งานจาก Inbox',exact:true})});
 await expect(row()).toHaveCount(1);
 let id='';
 if(!demo) {
  const saved=await (await page.request.get('/api/data')).json();
  id=saved.tasks[0].id;
  expect(saved.tasks[0]).toMatchObject({date:null,dueDate:null,time:'',important:null,urgent:null,checklist:[]});
 }
 await row().getByRole('button',{name:'งานจาก Inbox',exact:true}).click();
 await page.getByLabel('วันครบกำหนด',{exact:true}).fill('2026-10-05');
 await page.getByLabel('เวลา',{exact:true}).fill('14:30');
 await page.getByRole('button',{name:'เพิ่มรายการย่อย',exact:true}).click();
 await page.getByRole('textbox',{name:'รายการย่อย 1',exact:true}).fill('ขั้นแรก');
 await page.getByRole('button',{name:'เพิ่มรายการย่อย',exact:true}).click();
 await page.getByRole('textbox',{name:'รายการย่อย 2',exact:true}).fill('ขั้นสอง');
 await page.getByRole('button',{name:'เลื่อนรายการย่อย 2 ขึ้น',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'รายการย่อย 1',exact:true})).toHaveValue('ขั้นสอง');
 await page.getByRole('button',{name:'บันทึก',exact:true}).click();
 await nav('เมทริกซ์');
 await expect(page.locator('section').filter({has:page.getByRole('heading',{name:/ยังไม่จัดหมวด/})})).toContainText('งานจาก Inbox');
 await row().getByRole('button',{name:'งานจาก Inbox',exact:true}).click();
 await page.getByLabel('ความสำคัญ',{exact:true}).selectOption('false');
 await page.getByLabel('ความเร่งด่วน',{exact:true}).selectOption('true');
 await page.getByRole('button',{name:'บันทึก',exact:true}).click();
 await expect(page.getByRole('region',{name:'จัดการเร็ว / ฝากคนอื่น',exact:true})).toContainText('งานจาก Inbox');
 await nav('จดด่วน');
 await row().getByRole('button',{name:'ทำวันนี้',exact:true}).click();
 await expect(row()).toHaveCount(0);
 await nav('วันนี้');
 await expect(row()).toHaveCount(1);
 await row().locator('summary').click();
 await row().getByLabel('ขั้นสอง',{exact:true}).check();
 await expect(row().locator('summary')).toHaveText('รายการย่อย 1/2');
 await row().getByRole('button',{name:'ทำเสร็จ งานจาก Inbox',exact:true}).click();
 await expect(page.getByRole('heading',{name:'รายการย่อยยังไม่ครบ'})).toBeVisible();
 await page.getByRole('button',{name:'ทำต่อก่อน',exact:true}).click();
 await row().getByRole('button',{name:'ทำเสร็จ งานจาก Inbox',exact:true}).click();
 await page.getByRole('button',{name:'ปิดงานหลัก',exact:true}).click();
 await nav('เมทริกซ์');
 await page.locator('.matrix-completed').filter({has:page.locator('summary')}).locator('summary').click();
 await row().getByRole('button',{name:'ยกเลิกการทำเสร็จ งานจาก Inbox',exact:true}).click();
 await expect(row().locator('summary')).toHaveText('รายการย่อย 1/2');
 await row().getByRole('button',{name:'งานจาก Inbox',exact:true}).click();
 await page.getByLabel('วันที่วางแผนทำ',{exact:true}).fill('2026-09-29');
 await page.getByRole('button',{name:'บันทึก',exact:true}).click();
 await nav('วันนี้');
 await expect(page.locator('.overdue-label')).toContainText('งานค้างจากวันก่อน');
 await expect(row()).not.toContainText('เลยกำหนด');
 await page.getByLabel('วันที่เลือก').fill('2026-09-28');
 await expect(row()).toHaveCount(0);
 await page.getByLabel('วันที่เลือก').fill('2026-09-30');
 await row().getByRole('button',{name:'เลือกวันใหม่',exact:true}).click();
 await page.getByLabel('วันที่วางแผนทำ',{exact:true}).fill('2026-09-28');
 await page.getByRole('button',{name:'บันทึก',exact:true}).click();
 await expect(row()).toContainText('ครบกำหนด 5 ตุลาคม');
 await row().getByRole('button',{name:'เก็บไว้ก่อน',exact:true}).click();
 await nav('จดด่วน');
 await expect(row()).toContainText('ครบกำหนด 5 ตุลาคม');
 await row().getByRole('button',{name:'ทำวันนี้',exact:true}).click();
 await nav('วันนี้');
 await page.getByRole('group',{name:'มุมมองวันนี้'}).getByRole('button',{name:'ปฏิทิน',exact:true}).click();
 await expect(row()).toHaveCount(1);
 await expect(row()).toContainText('รายการย่อย 1/2');
 await row().getByRole('button',{name:'งานจาก Inbox',exact:true}).click();
 await page.getByRole('button',{name:'ลบรายการย่อย 2',exact:true}).click();
 await page.getByRole('textbox',{name:'รายการย่อย 1',exact:true}).fill('ขั้นสองแก้ไข');
 await page.getByRole('button',{name:'บันทึก',exact:true}).click();
 await expect(row().locator('summary')).toHaveText('รายการย่อย 1/1');
 await expect(row().getByRole('button',{name:'ทำเสร็จ งานจาก Inbox',exact:true})).toBeVisible();
 if(!demo) {
  const data=await (await page.request.get('/api/data')).json();
  expect(data.tasks).toHaveLength(1);
  expect(data.tasks[0]).toMatchObject({id,date:'2026-09-30',dueDate:'2026-10-05',time:'14:30',important:false,urgent:true,done:false});
  expect(data.tasks[0].checklist).toMatchObject([{title:'ขั้นสองแก้ไข',done:true}]);
 }
 for(const width of [360,768,1440]) {
  await page.setViewportSize({width,height:900});
  for(const name of ['วันนี้','จดด่วน','เมทริกซ์','กิจวัตร','บัญชี']) {
   await page.locator(width<=700?'.bottom-nav':'.sidebar nav').getByRole('button',{name,exact:true}).click();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name} at ${width}`).toBe(true);
  }
  await page.locator(width<=700?'.bottom-nav':'.sidebar nav').getByRole('button',{name:'วันนี้',exact:true}).click();
  await page.getByRole('group',{name:'มุมมองวันนี้'}).getByRole('button',{name:'ปฏิทิน',exact:true}).click();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`ปฏิทิน at ${width}`).toBe(true);
 }
 await page.reload();
 await expect(page.getByRole('heading',{name:'วันนี้ของคุณ'})).toBeVisible();
 if(demo)await expect(page.getByRole('button',{name:'งานจาก Inbox',exact:true})).toHaveCount(0);
 else await expect(row()).toContainText('รายการย่อย 1/1');
}

test('account planning, checklist and matrix share one persisted task',async({page})=>{await workflow(page,false);});
browserTest('Demo supports planning and checklists without account requests',async({page})=>{
 const calls:string[]=[];
 await page.route('**/api/**',route=>{calls.push(route.request().url());return route.abort();});
 await workflow(page,true);
 expect(calls).toEqual([]);
});
