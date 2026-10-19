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
# pipefail สำคัญมาก: ถ้าไม่ตั้ง สถานะของไปป์จะเอาของ gzip ตัวท้ายเท่านั้น
# pg_dump ล้มแต่ gzip สำเร็จ สคริปต์จะบันทึกว่า "สำรองสำเร็จ" ทั้งที่ได้ไฟล์เปล่า
# (เคยเกิดมาแล้ว 3 วันติด ฐานข้อมูลดับอยู่ แต่ log ขึ้นว่าสำเร็จทุกวัน
#  แล้วไฟล์เปล่าไปทับไฟล์ดีของวันเดียวกันจนไม่เหลือสำรองที่ใช้ได้เลย)
set -o pipefail

DIR=/home/dev/dbbackup
KEEP=14
MIN_BYTES=100000     # ไฟล์จริงตอนนี้ ~5.8 MB · เล็กกว่านี้มากแปลว่าดัมป์ไม่ครบ
export PGPASSWORD="${BOX_DB_PASSWORD:?ต้องตั้ง BOX_DB_PASSWORD ก่อน}"

mkdir -p "$DIR"

while true; do
  OUT="$DIR/farmy-$(date +%Y%m%d).sql.gz"
  ok=0
  # --clean --if-exists = ไฟล์กู้คืนรันทับของเดิมได้เลย ไม่ต้องลบตารางเอง
  if pg_dump -h 127.0.0.1 -U farmy -d farmy --clean --if-exists 2>>"$DIR/backup.log" | gzip > "$OUT.tmp"; then
    size=$(stat -c %s "$OUT.tmp" 2>/dev/null || echo 0)
    # ตรวจขนาดอีกชั้น เผื่อดัมป์ออกมาได้แต่ได้ไม่ครบ
    # ห้ามเอาไฟล์ที่น่าสงสัยไปทับของเดิม ของเดิมที่ใช้ได้มีค่ากว่าของใหม่ที่พัง
    if [ "$size" -ge "$MIN_BYTES" ]; then
      mv "$OUT.tmp" "$OUT"
      echo "$(date '+%F %T') สำรองสำเร็จ $(du -h "$OUT" | cut -f1)" >> "$DIR/backup.log"
      ok=1
    else
      rm -f "$OUT.tmp"
      echo "$(date '+%F %T') สำรองไม่สำเร็จ ไฟล์เล็กผิดปกติ ($size ไบต์) เก็บของเดิมไว้" >> "$DIR/backup.log"
    fi
  else
    rm -f "$OUT.tmp"
    echo "$(date '+%F %T') สำรองไม่สำเร็จ pg_dump ล้ม เก็บของเดิมไว้" >> "$DIR/backup.log"
  fi
  [ "$ok" = 1 ] || true

  # ลบของเก่าที่เกินจำนวนที่เก็บ
  ls -1t "$DIR"/farmy-*.sql.gz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f

  sleep 86400
done
