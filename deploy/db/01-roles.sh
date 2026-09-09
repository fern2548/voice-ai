#!/bin/sh
# สร้าง role ที่ PostgREST ต้องใช้ — รันครั้งเดียวตอนฐานข้อมูลถูกสร้างใหม่
#
# เขียนเป็นสคริปต์แทนไฟล์ .sql เพราะต้องใช้รหัสผ่านจากตัวแปรแวดล้อม
# ซึ่งไฟล์ .sql ธรรมดาอ่านไม่ได้ (จะกลายเป็นข้อความตรง ๆ)
#
# แนวคิด: PostgREST ต่อฐานข้อมูลด้วย authenticator ซึ่งไม่มีสิทธิ์อะไรเลย
# แล้วค่อยสวมบทบาทตาม role ที่ระบุในกุญแจที่ผู้เรียกส่งมา
#   ไม่มีกุญแจ        -> anon          อ่านได้อย่างเดียว
#   กุญแจ service_role -> service_role  ทำได้ทุกอย่าง (เซิร์ฟเวอร์เราใช้อันนี้)
set -e

psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" <<SQL
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;

create role authenticator noinherit login password '$POSTGRES_PASSWORD';
grant anon, authenticated, service_role to authenticator;

grant usage on schema public to anon, authenticated, service_role;

alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant select on tables to anon, authenticated;
SQL
