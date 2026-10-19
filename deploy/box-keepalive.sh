#!/bin/bash
# เฝ้าให้บริการหลักของกล่องยังทำงานอยู่ ตายเมื่อไหร่ปลุกกลับทันที
#
# ทำไมต้องมี: ฐานข้อมูลเคยตายเงียบ ๆ แล้วไม่มีใครรู้
# ครั้งนั้น PostgreSQL กับ PostgREST ดับไปตั้งแต่ 16 ต.ค. แต่เพิ่งมาเจอวันที่ 19
# ระหว่างนั้นเว็บตอบ 500 ทุกคำขอที่ต้องใช้ข้อมูล ทั้งที่ตัวเว็บกับ API ยังรันอยู่ปกติ
# (ตัวเว็บไม่ได้ตาย เลยไม่มีสัญญาณอะไรบอกว่ามีปัญหา)
#
# กล่องนี้ไม่มี systemd ที่สั่ง restart อัตโนมัติได้ และไม่มี cron
# จึงต้องเป็นลูปที่ autostart.sh ปลุกค้างไว้ เหมือนตัวสำรองฐานข้อมูล
#
# ตรวจทุก 60 วินาที เขียนบันทึกเฉพาะตอนที่ต้องปลุกจริง ไฟล์ log จะได้ไม่บวม

set -u
LOG=/home/dev/keepalive.log
PGVER=16

say() { echo "$(date '+%F %T') $*" >> "$LOG"; }

while true; do
  # ---- PostgreSQL ----
  if ! pg_isready -h 127.0.0.1 -q; then
    say "PostgreSQL ไม่ตอบ กำลังปลุก"
    pg_ctlcluster "$PGVER" main start >/dev/null 2>&1 || \
      pg_ctlcluster "$PGVER" main restart >/dev/null 2>&1
    # หลังไฟดับหรือโดนฆ่ากลางคัน ต้องกู้ข้อมูลก่อน ใช้เวลาเป็นนาที ต้องรอให้จบ
    for _ in $(seq 1 60); do
      pg_isready -h 127.0.0.1 -q && break
      sleep 5
    done
    pg_isready -h 127.0.0.1 -q && say "PostgreSQL กลับมาแล้ว" || say "ปลุก PostgreSQL ไม่สำเร็จ"
  fi

  # ---- PostgREST ----
  # เช็กว่าตอบจริง ไม่ใช่แค่โปรเซสยังอยู่ เคยเจอกรณีโปรเซสค้างแต่ตอบ 503 ทุกคำขอ
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://127.0.0.1:3001/farm_tasks?limit=1")
  if [ "$code" != "200" ]; then
    say "PostgREST ตอบ $code กำลังปลุกใหม่"
    pkill -x postgrest
    sleep 3
    setsid nohup /usr/local/bin/postgrest /home/dev/postgrest.conf >> /home/dev/postgrest.log 2>&1 </dev/null &
    sleep 8
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "http://127.0.0.1:3001/farm_tasks?limit=1")
    [ "$code" = "200" ] && say "PostgREST กลับมาแล้ว" || say "ปลุก PostgREST ไม่สำเร็จ (ได้ $code)"
  fi

  # ---- ตัวเว็บ/API ----
  if ! ss -lnt | grep -q ':8000'; then
    say "เว็บไม่ได้ฟังพอร์ต 8000 กำลังปลุก"
    bash /home/dev/autostart.sh >/dev/null 2>&1
  fi

  sleep 60
done
