-- เปิดสิทธิ์ให้ตารางที่เพิ่งสร้างในไฟล์ก่อนหน้า
-- (default privileges ข้างบนมีผลกับตารางที่สร้าง "หลัง" คำสั่งนั้น
--  แต่ไฟล์ 02 รันในทรานแซกชันเดียวกัน จึงต้อง grant ซ้ำให้ชัวร์)
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant select on all tables in schema public to anon, authenticated;
grant execute on all functions in schema public to anon, authenticated, service_role;
