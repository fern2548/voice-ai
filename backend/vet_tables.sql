-- ตารางชุมชนปรึกษาสัตวแพทย์ — รันในหน้า SQL Editor ของ Supabase
-- ปลอดภัยถ้ารันซ้ำ ทุกคำสั่งใช้ if not exists

create table if not exists vet_posts (
  id bigint generated always as identity primary key,
  title text not null,
  detail text,
  image text,                     -- รูปย่อแล้ว เก็บเป็น data URL (หน้าเว็บย่อก่อนส่ง)
  author text not null,           -- ผู้โพสต์ (ชื่อผู้ใช้)
  farm_name text,
  barn_no text,
  pen_no text,
  pig_count integer,
  age_stage text,
  status text not null default 'waiting',   -- waiting = รอคำตอบ · claimed = มีหมอดูแลแล้ว · done = เสร็จสิ้น
  claimed_by text,
  claimed_at timestamptz,
  closed_at timestamptz,
  close_note text,
  views integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists vet_posts_status_idx on vet_posts (status, created_at desc);

create table if not exists vet_comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references vet_posts(id) on delete cascade,
  author text not null,
  is_vet boolean not null default false,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists vet_comments_post_idx on vet_comments (post_id, created_at);

-- ชื่อที่แสดงในโพสต์/ความคิดเห็น เก็บไว้ตอนโพสต์ จะได้ไม่ต้อง join ทุกครั้ง
alter table vet_posts    add column if not exists author_name  text;
alter table vet_comments add column if not exists author_name  text;
alter table vet_posts    add column if not exists claimed_name text;   -- ชื่อหมอที่รับเคส (claimed_by เก็บ username ไว้ตรวจสิทธิ์)
