#!/bin/bash
# สำรองฐานข้อมูลของกล่องวันละครั้ง
#
# ตั้งแต่ย้ายข้อมูลออกจาก Supabase คลาวด์มาไว้ในกล่อง ข้อมูลฟาร์มทั้งหมดอยู่ที่เดียว
# ถ้ากล่องโดนล้างหรือถูกเรียกคืน แล้วไม่มีสำรอง ข้อมูลหายหมด ไม่มีทางกู้
#
# กล่องนี้ไม่มี cron จึงทำเป็นลูปที่ autostart.sh ปลุกขึ้นมาค้างไว้
# เก็บย้อนหลัง 14 ชุด ชุดละไม่กี่ MB (ข้อมูลตอนนี้ ~1,100 แถว)
#
# กู้คืน:  gunzip -c /home/dev/dbbackup/farmy-YYYYMMDD.sql.gz | psql -h 127.0.0.1 -U farmy -d farmy

set -u
DIR=/home/dev/dbbackup
KEEP=14
export PGPASSWORD="${BOX_DB_PASSWORD:?ต้องตั้ง BOX_DB_PASSWORD ก่อน}"

mkdir -p "$DIR"

while true; do
  OUT="$DIR/farmy-$(date +%Y%m%d).sql.gz"
  # --clean --if-exists = ไฟล์กู้คืนรันทับของเดิมได้เลย ไม่ต้องลบตารางเอง
  if pg_dump -h 127.0.0.1 -U farmy -d farmy --clean --if-exists 2>>"$DIR/backup.log" | gzip > "$OUT.tmp"; then
    mv "$OUT.tmp" "$OUT"
    echo "$(date '+%F %T') สำรองสำเร็จ $(du -h "$OUT" | cut -f1)" >> "$DIR/backup.log"
  else
    rm -f "$OUT.tmp"
    echo "$(date '+%F %T') สำรองไม่สำเร็จ" >> "$DIR/backup.log"
  fi

  # ลบของเก่าที่เกินจำนวนที่เก็บ
  ls -1t "$DIR"/farmy-*.sql.gz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f

  sleep 86400
done
