-- ตารางสำหรับ "งานประจำวัน + สรุปฟาร์มรายวัน"
-- รันไฟล์นี้ใน Supabase SQL Editor (หรือ psql) ครั้งเดียว ของเดิมไม่กระทบ
-- ไฟล์นี้รันซ้ำได้ ไม่พัง (ใช้ if not exists ทุกคำสั่ง)

-- ---------- งานประจำที่ต้องทำซ้ำ ----------
-- ของเดิมใน farm_tasks เป็นงานครั้งเดียว งานอย่าง "ให้อาหารเช้า" ต้องโผล่ใหม่ทุกวัน
-- จึงเก็บเป็น "แม่แบบ" ไว้ที่นี่ แล้วให้ระบบสร้างงานของวันนั้นลง farm_tasks ให้เองทุกเช้า
create table if not exists farm_routines (
  id bigint generated always as identity primary key,
  title text not null,
  detail text,
  barn_no text,
  pen_no text,
  -- วันในสัปดาห์ที่ต้องทำ: 0=อาทิตย์ … 6=เสาร์ · ว่าง = ทุกวัน
  weekdays smallint[] not null default '{}',
  due_time text,                              -- '06:30' ใช้เรียงลำดับงานในวัน
  priority text not null default 'normal',    -- normal | urgent
  assignee text,                              -- username ของคนที่รับผิดชอบ
  assignee_name text,                         -- ชื่อที่แสดง เก็บซ้ำไว้กันกรณีผู้ใช้ถูกลบ
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists farm_routines_active_idx on farm_routines (active, sort_order);

-- ---------- บันทึกการผสมพันธุ์ ----------
-- เดิมเก็บไว้ใน localStorage ของเบราว์เซอร์ เซิร์ฟเวอร์จึงมองไม่เห็น
-- สรุปฟาร์มรายวันเลยรายงานเรื่องผสมพันธุ์ไม่ได้ และข้อมูลหายถ้าล้างเบราว์เซอร์หรือเปลี่ยนเครื่อง
create table if not exists breeding_log (
  id bigint generated always as identity primary key,
  dam_no text not null,                       -- เบอร์แม่สุกร
  dam_breed text,
  dam_line text,
  sire_no text,                               -- เบอร์พ่อพันธุ์ / น้ำเชื้อ
  sire_breed text,
  sire_line text,
  round int not null default 1,               -- ผสมครั้งที่
  mate_date date not null,
  result text not null default 'wait',        -- wait = รอดูผล · pregnant = ติด · failed = ไม่ติด
  farrow_date date,                           -- วันคลอดจริง (กำหนดคลอดคำนวณจาก mate_date + 114)
  piglet_count int,
  note text,
  by_user text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists breeding_log_mate_idx on breeding_log (mate_date desc);

-- ---------- งานประจำชุดเริ่มต้น ----------
-- ใส่ให้พอเริ่มใช้งานได้เลย ฟาร์มแก้ไข/ลบ/เพิ่มเองได้ในหน้า "งานวันนี้"
-- ใส่เฉพาะตอนตารางยังว่าง รันไฟล์ซ้ำจะไม่สร้างซ้ำ
insert into farm_routines (title, detail, due_time, priority, sort_order)
select * from (values
  ('ให้อาหารมื้อเช้า', 'ดูว่าหมูกินหมดทุกคอกไหม ตัวไหนไม่เข้ากินให้จดไว้', '06:30', 'normal', 10),
  ('ตรวจน้ำกินทุกจุด', 'กดจุกน้ำดูว่าน้ำไหลแรงพอ ไม่มีจุกตัน และรางไม่มีคราบ', '07:00', 'normal', 20),
  ('เดินดูหมูป่วยทุกคอก', 'ไล่ให้ลุกยืน ดูตัวที่ซึม ไม่กิน ไอ หรือเดินผิดปกติ แล้วบันทึกในระบบ', '07:30', 'urgent', 30),
  ('จดอุณหภูมิและความชื้นในโรงเรือน', 'จดค่าที่อ่านได้ เทียบกับช่วงมาตรฐาน 20-28°C และ 60-70%', '08:00', 'normal', 40),
  ('เก็บมูลและล้างร่องระบาย', 'เก็บมูลแห้งก่อนฉีดน้ำ จะได้ไม่เปลืองน้ำและคราบไม่กระจาย', '09:00', 'normal', 50),
  ('ให้อาหารมื้อเย็น', 'ดูว่าหมูกินหมดทุกคอกไหม และเก็บอาหารเหลือออก', '16:00', 'normal', 60),
  ('ปิดโรงเรือนและตรวจรอบสุดท้าย', 'เช็กพัดลม ไฟ ม่าน และประตูก่อนเลิกงาน', '17:30', 'normal', 70)
) as v(title, detail, due_time, priority, sort_order)
where not exists (select 1 from farm_routines);
