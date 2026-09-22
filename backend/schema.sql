-- รันใน Supabase SQL Editor ครั้งเดียวตอนตั้งโปรเจกต์
create table if not exists weather_readings (
  id bigint generated always as identity primary key,
  temperature double precision,
  humidity double precision,
  windspeed double precision,
  rainfall double precision,
  light double precision,
  created_at timestamptz not null default now()
);

create index if not exists weather_readings_created_at_idx
  on weather_readings (created_at desc);

-- เก็บผลทำนายจากโมเดล LSTM (predicted_for = เวลาที่ทำนายว่าจะเป็นตอนนั้น)
-- ไว้เทียบกับ weather_readings จริงตาม target time ในภายหลัง
create table if not exists weather_predictions (
  id bigint generated always as identity primary key,
  predicted_for timestamptz,
  temperature_pred double precision,
  humidity_pred double precision,
  windspeed_pred double precision,
  rainfall_pred double precision,
  light_pred double precision,
  created_at timestamptz not null default now()
);

create index if not exists weather_predictions_predicted_for_idx
  on weather_predictions (predicted_for desc);

-- สรุปสถิติย้อนหลัง (เฉลี่ย/ต่ำสุด/สูงสุด) ให้ AI ใช้ตอบคำถามเชิงประวัติ เช่น
-- "สัปดาห์นี้ร้อนสุดกี่องศา" โดยคำนวณที่ฝั่ง Postgres (เร็วกว่าดึง raw rows มาคำนวณเอง)
create or replace function weather_stats(since timestamptz)
returns table (
  reading_count bigint,
  temperature_avg double precision,
  temperature_min double precision,
  temperature_max double precision,
  humidity_avg double precision,
  humidity_min double precision,
  humidity_max double precision,
  windspeed_avg double precision,
  windspeed_max double precision,
  rainfall_sum double precision,
  rainy_readings bigint,
  light_avg double precision
)
language sql stable as $$
  select
    count(1),
    avg(temperature), min(temperature), max(temperature),
    avg(humidity), min(humidity), max(humidity),
    avg(windspeed), max(windspeed),
    sum(rainfall), count(1) filter (where rainfall > 0),
    avg(light)
  from weather_readings
  where created_at >= since;
$$;

-- บันทึกจำนวนหมูป่วยรายวัน (กรอกมือ ไม่ได้มาจากเซนเซอร์) — ใช้หน้า "บันทึกหมูป่วย"
-- และให้ AI อ้างอิงตอบคำถามเรื่องสุขภาพหมูได้
create table if not exists pig_health_log (
  id bigint generated always as identity primary key,
  log_date date not null,
  sick_count integer not null,
  total_count integer,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists pig_health_log_date_idx
  on pig_health_log (log_date desc);

-- บันทึกการฉีดวัคซีน/ยาให้หมู (กรอกมือหรือสั่งด้วยเสียงผ่าน Voice AI)
create table if not exists vaccine_log (
  id bigint generated always as identity primary key,
  log_date date not null,
  vaccine_name text,
  barn_no text,       -- เลขโรงเรือน
  pen_no text,        -- เลขคอก
  pig_count integer,  -- จำนวนหมูที่ฉีด
  injector text,      -- ผู้ฉีด
  lot_no text,        -- Lot/Batch วัคซีน
  dose text,          -- ปริมาณ/ขนาดยา (เช่น "2ml")
  log_time text,      -- เวลาที่ฉีด (เช่น "09:30")
  next_due_date date, -- นัดฉีดครั้งถัดไป
  note text,
  created_at timestamptz not null default now()
);

create index if not exists vaccine_log_date_idx
  on vaccine_log (log_date desc);

-- รันก้อนนี้แยกถ้าตาราง vaccine_log มีอยู่แล้วก่อนหน้า (เพิ่มคอลัมน์ใหม่โดยไม่ลบข้อมูลเดิม)
alter table vaccine_log add column if not exists barn_no text;
alter table vaccine_log add column if not exists pen_no text;
alter table vaccine_log add column if not exists pig_count integer;
alter table vaccine_log add column if not exists injector text;
alter table vaccine_log add column if not exists lot_no text;
alter table vaccine_log add column if not exists dose text;
alter table vaccine_log add column if not exists log_time text;
alter table vaccine_log add column if not exists next_due_date date;

-- กำหนดรอบฉีดซ้ำต่อวัคซีน 1 ชื่อ = 1 กำหนด (ผู้ใช้/สัตวแพทย์เป็นคนตั้งเอง ระบบไม่เดาเอง)
-- เมื่อบันทึกฉีดวัคซีนที่มีชื่อตรงกับตารางนี้ ระบบจะคำนวณ next_due_date ให้อัตโนมัติ
create table if not exists vaccine_schedule (
  vaccine_name text primary key,
  interval_days integer not null,
  note text,
  created_at timestamptz not null default now()
);

-- ผู้ใช้ admin หลายคน (แทนที่รหัสผ่านเดียวแบบเดิม) — เก็บ password แบบ hash+salt เสมอ ไม่เก็บ plain text
create table if not exists admin_users (
  id bigint generated always as identity primary key,
  username text not null unique,
  password_hash text not null,
  password_salt text not null,
  created_at timestamptz not null default now()
);


-- คลังความรู้ (RAG): เอกสารของฟาร์มที่ให้ AI ค้นมาใช้ตอบ
-- knowledge_docs = 1 แถวต่อเอกสาร · knowledge_chunks = เอกสารหั่นเป็นท่อน พร้อม vector (jsonb 768 ตัวเลข)
create table if not exists knowledge_docs (
  id bigint generated always as identity primary key,
  title text not null,
  source text,
  chars int,
  chunk_count int,
  created_at timestamptz not null default now()
);

create table if not exists knowledge_chunks (
  id bigint generated always as identity primary key,
  doc_id bigint not null references knowledge_docs(id) on delete cascade,
  idx int not null,
  title text not null,
  content text not null,
  embedding jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists knowledge_chunks_doc_idx on knowledge_chunks (doc_id);

-- ติดตามอาการหลังฉีดวัคซีน — 1 แถว = ตรวจ 1 ครั้งของการฉีด 1 รายการ
-- ตรวจหลายรอบต่อการฉีดหนึ่งครั้งได้ (ปกติวันที่ 1, 3, 7 ตั้งได้ที่ FOLLOWUP_DAYS)
create table if not exists vaccine_followup (
  id bigint generated always as identity primary key,
  vaccine_log_id bigint not null references vaccine_log(id) on delete cascade,
  check_date date not null,
  days_after integer,        -- ตรวจวันที่เท่าไหร่หลังฉีด (คำนวณให้ตอนบันทึก)
  swelling text,             -- none | mild | moderate | severe
  fever boolean,
  appetite text,             -- normal | reduced | none
  lethargy boolean,          -- ซึม ไม่ค่อยเคลื่อนไหว
  affected_count integer,    -- จำนวนตัวที่มีอาการ
  severity text,             -- ปกติ | เฝ้าระวัง | ต้องดูแล (คำนวณจากอาการด้วยกฎตายตัว)
  note text,
  checked_by text,
  created_at timestamptz not null default now()
);

create index if not exists vaccine_followup_log_idx on vaccine_followup (vaccine_log_id);
create index if not exists vaccine_followup_date_idx on vaccine_followup (check_date desc);

-- ทะเบียนวัคซีน (หมวด 1) — 1 แถว = วัคซีน 1 ล็อต ไว้ตรวจย้อนหลังและทำเอกสาร GAP
create table if not exists vaccine_products (
  id bigint generated always as identity primary key,
  name text not null,
  disease text,
  lot_no text,
  mfg_date date,
  exp_date date,
  manufacturer text,
  distributor text,
  route text,
  dose text,
  note text,
  created_at timestamptz not null default now()
);

-- บันทึกการฉีด: เพิ่มช่องให้ครบ 4 หมวด (ของเดิมไม่หาย)
alter table vaccine_log add column if not exists product_id bigint references vaccine_products(id) on delete set null;
alter table vaccine_log add column if not exists route text;
alter table vaccine_log add column if not exists reaction text;
alter table vaccine_log add column if not exists pig_ids text;
alter table vaccine_log add column if not exists male_count integer;
alter table vaccine_log add column if not exists female_count integer;
alter table vaccine_log add column if not exists age_stage text;
alter table vaccine_log add column if not exists pig_status text;
alter table vaccine_log add column if not exists antibody_result text;
