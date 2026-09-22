-- ตารางใหม่สำหรับ Farmy Voice (รันซ้ำได้ ไม่กระทบข้อมูลเดิม)
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
alter table vaccine_log add column if not exists reaction_note text;
alter table vaccine_log add column if not exists pig_ids text;
alter table vaccine_log add column if not exists male_count integer;
alter table vaccine_log add column if not exists female_count integer;
alter table vaccine_log add column if not exists age_stage text;
alter table vaccine_log add column if not exists pig_status text;
alter table vaccine_log add column if not exists antibody_result text;

-- แผนวัคซีนตามอายุ: ชุดหมู (วันเกิด) × โปรแกรม (วัคซีน/เข็ม/อายุ) → ระบบคำนวณวันฉีดให้ ไม่เก็บแผนลงตาราง
create table if not exists pig_batches (
  id bigint generated always as identity primary key,
  name text not null,
  birth_date date not null,
  barn_no text,
  pen_no text,
  pig_count integer,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists vaccine_programs (
  id bigint generated always as identity primary key,
  vaccine_name text not null,
  dose_no integer not null default 1,
  age_days integer not null,     -- ฉีดตอนอายุกี่วัน
  route text,
  dose text,
  repeat_days integer,           -- กระตุ้นซ้ำทุกกี่วันหลังเข็มนี้ (ว่าง = ไม่กระตุ้น)
  note text,
  created_at timestamptz not null default now()
);

-- บันทึกการฉีดผูกกับแผน (ฉีดแล้วเข็มนั้นของชุดนั้นเป็น ✓)
-- แม่หมูเคยได้รับวัคซีนอหิวาต์ไหม (false = ลูกฉีดเข็มเดียวอายุ 1 วัน แล้วซ้ำทุกปี)
alter table pig_batches add column if not exists sow_vaccinated boolean not null default true;
alter table vaccine_log add column if not exists batch_id bigint references pig_batches(id) on delete set null;
alter table vaccine_log add column if not exists program_id bigint references vaccine_programs(id) on delete set null;
alter table vaccine_log add column if not exists booster_no integer;
