#!/bin/sh
# สำรองข้อมูลฐานข้อมูลออกมาเป็นไฟล์เดียว — รันได้ทุกวันหรือก่อนย้ายเครื่อง
#
#   sh backup.sh
#
# ได้ไฟล์ backups/farmy-YYYY-MM-DD.sql
# ย้ายเครื่องแล้วกู้คืนด้วย:
#   docker exec -i supabase_db_dashboard psql -U postgres postgres < ไฟล์.sql

set -e
DIR="$(dirname "$0")/backups"
mkdir -p "$DIR"
OUT="$DIR/farmy-$(date +%Y-%m-%d).sql"

# ชื่อคอนเทนเนอร์ฐานข้อมูลที่ Supabase CLI สร้างให้ ขึ้นต้นด้วย supabase_db_
DB=$(docker ps --filter "name=supabase_db_" --format "{{.Names}}" | head -1)
if [ -z "$DB" ]; then
  echo "ไม่พบคอนเทนเนอร์ฐานข้อมูล — สั่ง supabase start ก่อน"
  exit 1
fi

docker exec "$DB" pg_dump -U postgres --clean --if-exists postgres > "$OUT"
echo "สำรองแล้ว: $OUT"
ls -lh "$OUT"
