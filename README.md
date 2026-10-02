# Daydo Backend

NestJS + MySQL 8.4 เป็น Git repo อิสระชื่อ `daydo-backend` มี dependencies, config, migrations และ tests ของตัวเอง ไม่ import โค้ดหรืออ่านไฟล์จาก repo frontend

## เริ่มใช้งาน

ใช้ Node.js 22.12+ (`nvm use` ถ้ามี nvm), npm และ Docker Desktop

```sh
npm ci
cp .env.example .env
# สำหรับติดตั้งใหม่ เปลี่ยน MYSQL_PASSWORD และ MYSQL_ROOT_PASSWORD เป็นรหัสสุ่มคนละค่า
npm run db:up
npm run db:migrate
npm run dev
```

ถ้ามี `.env` แล้วใช้ไฟล์เดิม เครื่องที่แยกโฟลเดอร์ครั้งนี้เก็บรหัสและข้อมูล MySQL เดิมไว้ครบ ไม่ต้องสร้างฐานข้อมูลใหม่

API อยู่ที่ http://127.0.0.1:3001/api และ health check ที่ `/api/health` MySQL เปิดเฉพาะ `127.0.0.1:3307` ค่าการเชื่อมต่อทั้งหมดอยู่ใน `.env` ของ backend

เครื่องนี้มี Node.js 22 แบบ local ใน devDependencies หากระบบยังเป็น Node รุ่นเก่า หลังติดตั้งแล้วใช้ `export PATH="$PWD/node_modules/node/bin:$PATH"`

`APP_ORIGIN` ต้องตรงกับ origin ของหน้าเว็บ เช่น `http://localhost:3000` รัน API และ build ได้โดยไม่ต้องมี repo frontend อยู่ในเครื่อง `.env.example` ไม่มีรหัสจริง และ `.env` ถูก ignore

## Docker และข้อมูลเดิม

`compose.yaml` กำหนด project name เป็น `prject` เพื่อใช้ container และ volume `prject_mysql_data` เดิม แม้ย้าย repo หรือเปลี่ยนชื่อโฟลเดอร์แล้วก็ตาม `npm run db:down` หยุด MySQL โดยเก็บ volume ไว้ ไม่ใช้ `down -v` หากต้องการเก็บข้อมูล

การเปลี่ยนรหัสใน `.env` หลังสร้าง volume ไม่ได้เปลี่ยนรหัสใน MySQL อัตโนมัติ ต้องเปลี่ยนผู้ใช้ MySQL ให้ตรงกันด้วย Migration อ่านจาก `migrations/` ของ repo นี้และบันทึกเวอร์ชันใน `schema_migrations`

## ตรวจสอบและ build

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

`npm test` ทดสอบ validation โดยไม่ต้องเปิด MySQL ส่วน `npm run test:api` ทดสอบ API จริงกับ backend ที่เปิดอยู่ โดยไม่ต้องเปิด frontend หรือ Chromium

ชุด browser integration tests ต้องเปิด MySQL, backend และ frontend ที่ต้องการทดสอบก่อน:

```sh
npm run test:install
npm run test:e2e
# เปลี่ยนเว็บที่ต้องการทดสอบได้ด้วย E2E_BASE_URL (APP_ORIGIN ต้องตรงกันด้วย)
```

Tests สร้างบัญชีสุ่ม `@example.test` และลบเฉพาะบัญชีที่สร้างหลังทดสอบ โดยใช้ค่าฐานข้อมูลของ backend นี้ จึงควรทดสอบกับเซิร์ฟเวอร์และฐานข้อมูลพัฒนาชุดเดียวกัน ตรวจ signup/login/logout, การแยกบัญชี, session ที่เพิกถอน, Origin, validation, revision conflict, retry, งาน/กิจวัตร/ประวัติ และหน้าจอมือถือ หากรันซ้ำจนติด rate limit ให้รอ 15 นาทีหรือรีสตาร์ต API พัฒนา

## API และการบันทึก

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `POST /api/auth/username` ตั้งชื่อผู้ใช้สำหรับเข้าสู่ระบบได้ครั้งเดียว (a-z 0-9 _ ความยาว 3–30)
- `POST /api/auth/profile` แก้ไขชื่อที่แสดง
- `POST /api/auth/password` เปลี่ยนรหัสผ่านโดยยืนยันรหัสปัจจุบัน
- เข้าสู่ระบบได้ด้วยอีเมลหรือชื่อผู้ใช้ (`login`)
- `GET /api/data`, `PUT /api/data`, `GET /api/health`
- POST/PUT ต้องส่ง `Origin` ตรงกับ `APP_ORIGIN` และคุกกี้เซสชันเมื่ออ่าน/แก้ข้อมูล
- เซิร์ฟเวอร์เลือกเจ้าของข้อมูลจากเซสชัน ตาราง users, sessions, tasks, habits, habit_checks แยกเจ้าของด้วย foreign keys
- รหัสผ่านใช้ scrypt พร้อม salt; session token เก็บเฉพาะ SHA-256 hash ในฐานข้อมูล ใช้คุกกี้ HttpOnly + SameSite=Strict อายุ 7 วัน ออกจากระบบแล้วเพิกถอนทันที
- จำกัดสมัครสมาชิก/ล็อกอิน 30 ครั้งต่อ 15 นาทีต่อ IP สำหรับ proxy ในเครื่องพัฒนานี้ใช้โควตาร่วมกัน
- `PUT /api/data` รับ `{version:2, revision, tasks, habits, checks}` และตอบ revision ใหม่ ใช้ transaction และปฏิเสธ stale revision ด้วย 409 เพื่อไม่เขียนทับข้อมูลอีกแท็บ
- งานรองรับ `date` (วันที่วางแผนทำ, null ได้), `dueDate`, `important`/`urgent` (boolean หรือ null), และ `checklist` เป็น JSON ภายในงานเดียวกัน Checklist ไม่ใช่ตารางแยก สิทธิ์เจ้าของยึดตาม `user_id` ของงาน
- `X-Account-Id` ช่วยตรวจกรณีอีกแท็บเปลี่ยนบัญชี ไม่ใช้เป็นหลักฐานยืนยันตัวตน
- จำกัด 1,000 งาน, 1,000 กิจวัตร, 10,000 ประวัติ, checklist งานละ 100 รายการ และ request 2 MB สำหรับแอปส่วนตัวขนาดเล็ก ไม่มี push sync ระหว่างแท็บ

## Deploy แยก

Build ด้วย `npm run build` แล้วรัน `npm start` เก็บ `migrations/` ไว้สำหรับคำสั่ง migration ตั้งค่าฐานข้อมูลผ่าน environment ของบริการ และตั้ง `API_HOST=0.0.0.0` หากแพลตฟอร์ม/container ต้องรับการเชื่อมต่อจากภายนอก process

ตั้ง `APP_ORIGIN` เป็น URL เว็บจริง เมื่อ `NODE_ENV=production` ต้องใช้ HTTPS และ `COOKIE_SECURE=true` Frontend ชี้ `API_URL` มาที่ backend นี้ ระบบยังไม่มีอีเมลยืนยันตัวตนหรือลืมรหัสผ่าน

## Git repo

โฟลเดอร์นี้มี `.git` ของตัวเอง ตั้ง remote เป็น `daydo-backend` ได้ Commit `package-lock.json` และ `.env.example`; `.env`, `node_modules`, `dist` และผลทดสอบถูก ignore

## การวางแผนงาน (Inbox / Checklist / Matrix)

รัน `npm run db:migrate` ให้ครบถึง `003_task_planning.sql` แล้วรีสตาร์ต backend หากยังไม่ได้รัน

Migration 003:
- ทำให้ `tasks.date` เป็น NULL ได้ (Inbox = ไม่มีวันวางแผน)
- เพิ่ม `due_date`, `important` (nullable), `checklist` (JSON array)
- ทำให้ `urgent` เป็น NULL ได้สำหรับสถานะยังไม่ระบุ
- แปลงข้อมูลเก่า: ตั้ง `important = TRUE` เฉพาะงานที่ `priority = 'high'` ไม่เดาความหมายของ `priority` ระดับอื่น และไม่รีเซ็ต `urgent` เดิม

API ใช้ snapshot `version: 2` เท่านั้น payload รุ่นเก่าจะถูกปฏิเสธ

## Habit Tracker รายเดือน

Migration `004_habit_months.sql` เพิ่มตาราง `habit_months` สำหรับเป้าหมาย บันทึก และทบทวนรายเดือน ส่งใน snapshot เป็น `habitMonths` (ค่าเริ่มต้น `[]` หากไม่มี) ตารางเช็กกิจวัตรเดิมยังใช้ติดตามวันต่อวันในกริดเหมือนเดิม

## Habit Tracker รายเดือน

Migration `004_habit_months.sql` เพิ่มตาราง `habit_months` สำหรับเป้าหมาย บันทึก และทบทวนรายเดือน ของแต่ละบัญชี หน้ากิจวัตรแสดงตารางเช็กทั้งเดือนจาก `habit_checks` เดิม และบันทึก journal ผ่าน snapshot field `habitMonths`
