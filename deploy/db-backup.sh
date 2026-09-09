#!/bin/sh
# สำรองฐานข้อมูลอัตโนมัติทุกคืน — ทำงานอยู่ในคอนเทนเนอร์ของตัวเอง
#
# ทำเป็นคอนเทนเนอร์แทนการตั้งเวลาใน Windows เพราะ
# ย้ายไปเซิร์ฟเวอร์ไหนก็ทำงานเหมือนเดิม ไม่ต้องไปตั้งค่าใหม่ที่เครื่องปลายทาง
#
# ตั้งค่าได้ผ่านตัวแปร: BACKUP_HOUR (ชั่วโมงที่จะสำรอง) · BACKUP_KEEP_DAYS (เก็บกี่วัน)
set -e

HOUR="${BACKUP_HOUR:-2}"
KEEP="${BACKUP_KEEP_DAYS:-14}"
OUT_DIR=/backups
mkdir -p "$OUT_DIR"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"; }

run_backup() {
  FILE="$OUT_DIR/farmy-$(date +%Y-%m-%d_%H%M).sql"
  # --clean --if-exists ทำให้ไฟล์นี้กู้คืนทับของเดิมได้เลย ไม่ต้องล้างฐานข้อมูลก่อน
  if pg_dump -h db -U postgres --clean --if-exists postgres > "$FILE" 2>/tmp/err; then
    gzip -f "$FILE"
    log "สำเร็จ: ${FILE}.gz ($(du -h "${FILE}.gz" | cut -f1))"
  else
    rm -f "$FILE"
    log "ล้มเหลว: $(cat /tmp/err | head -3)"
    return 1
  fi

  # ลบไฟล์ที่เก่ากว่ากำหนด ไม่ให้ดิสก์เต็ม
  DELETED=$(find "$OUT_DIR" -name 'farmy-*.sql.gz' -mtime "+$KEEP" -print -delete | wc -l)
  [ "$DELETED" -gt 0 ] && log "ลบไฟล์เก่าเกิน $KEEP วัน: $DELETED ไฟล์"
  return 0
}

log "เริ่มทำงาน — จะสำรองทุกวันเวลา ${HOUR}:00 น. เก็บย้อนหลัง ${KEEP} วัน"

# สำรองทันทีหนึ่งครั้งตอนเริ่ม จะได้รู้เลยว่าตั้งค่าถูกไหม ไม่ต้องรอถึงพรุ่งนี้
run_backup || true

while true; do
  NOW_H=$(date +%-H)
  NOW_M=$(date +%-M)
  # คำนวณว่าเหลืออีกกี่วินาทีถึงรอบถัดไป แล้วนอนรอทีเดียว
  # (ดีกว่าตื่นทุกนาทีมาเช็ค เพราะกินซีพียูน้อยกว่ามาก)
  MINS=$(( (HOUR - NOW_H) * 60 - NOW_M ))
  [ "$MINS" -le 0 ] && MINS=$(( MINS + 1440 ))
  log "รออีก $MINS นาที"
  sleep $(( MINS * 60 ))
  run_backup || true
done
