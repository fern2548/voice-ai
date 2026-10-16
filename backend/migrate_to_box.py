# -*- coding: utf-8 -*-
"""ย้ายข้อมูลจาก Supabase คลาวด์ มาไว้ในฐานข้อมูลของกล่องเอง

อ่านอย่างเดียวจากคลาวด์ ไม่ลบไม่แก้อะไรที่นั่น ข้อมูลเดิมยังอยู่ครบเป็นสำเนาสำรอง
ฝั่งปลายทางเขียนเป็นไฟล์ SQL แล้วค่อยให้ psql รัน ไม่ยิงผ่าน PostgREST
เพราะคอลัมน์ id เป็น generated always as identity ต้องใช้ OVERRIDING SYSTEM VALUE
ถึงจะคงเลข id เดิมไว้ได้ และเลข id เดิมต้องคงไว้ ไม่งั้นความสัมพันธ์ข้ามตารางจะพัง
(เช่น knowledge_chunks.doc_id ชี้ไป knowledge_docs.id)

วิธีใช้บนกล่อง:
    cd /home/dev/farmy/backend
    set -a; . ./.env; set +a          # ชี้ไปคลาวด์อยู่ จะได้อ่านของเดิมได้
    venv/bin/python migrate_to_box.py > /tmp/migrate.sql
    PGPASSWORD=... psql -h 127.0.0.1 -U farmy -d farmy -f /tmp/migrate.sql
"""
import os
import sys

from supabase import create_client

sys.stdout.reconfigure(encoding="utf-8")

# เรียงตามลำดับการพึ่งพา ตารางแม่ต้องมาก่อนตารางลูกที่อ้างถึงมัน
TABLES = [
    "admin_users",
    "weather_readings",
    "weather_predictions",
    "pig_health_log",
    "pig_batches",
    "vaccine_schedule",
    "vaccine_programs",
    "vaccine_products",
    "vaccine_log",
    "vaccine_followup",
    "vaccine_stock_moves",
    "farm_tasks",
    "vet_posts",
    "vet_comments",
    "knowledge_docs",
    "knowledge_chunks",
    "farm_routines",
    "breeding_log",
]

PAGE = 500   # ดึงทีละหน้า เผื่อตารางใหญ่อย่าง knowledge_chunks


def q(v) -> str:
    """แปลงค่า Python เป็นค่าคงที่ใน SQL"""
    if v is None:
        return "null"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(v)
    if isinstance(v, (list, dict)):
        import json
        return "'" + json.dumps(v, ensure_ascii=False).replace("'", "''") + "'"
    return "'" + str(v).replace("'", "''") + "'"


def main() -> None:
    sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

    print("-- ย้ายข้อมูลจาก Supabase คลาวด์เข้าฐานข้อมูลของกล่อง")
    print("-- สร้างอัตโนมัติด้วย backend/migrate_to_box.py")
    print("begin;")
    total = 0
    for t in TABLES:
        rows: list[dict] = []
        start = 0
        ok = True
        while True:
            try:
                page = sb.table(t).select("*").range(start, start + PAGE - 1).execute().data or []
            except Exception as e:
                print(f"-- ข้าม {t}: {e}", file=sys.stderr)
                ok = False
                break
            rows.extend(page)
            if len(page) < PAGE:
                break
            start += PAGE

        # อ่านจากคลาวด์ไม่ได้ = ตารางนั้นไม่มีบนคลาวด์ (เช่นตารางใหม่ที่สร้างในกล่องแล้ว)
        # ห้ามแตะของในกล่องเด็ดขาด ไม่งั้นข้อมูลที่มีอยู่แล้วจะโดนลบทิ้งฟรี ๆ
        if not ok:
            print(f"\n-- {t}: อ่านจากคลาวด์ไม่ได้ ข้ามไป ไม่แตะของเดิมในกล่อง")
            continue

        print(f"\n-- {t}: {len(rows)} แถว")
        print("-- (ล้างของเดิมในกล่องก่อน รันไฟล์นี้ซ้ำจะได้ไม่เกิดข้อมูลซ้ำ)")
        print(f"delete from {t};")
        if not rows:
            continue
        cols = list(rows[0].keys())
        collist = ", ".join(f'"{c}"' for c in cols)
        for r in rows:
            vals = ", ".join(q(r.get(c)) for c in cols)
            # OVERRIDING SYSTEM VALUE = ยอมให้ใส่เลข id เดิมลงคอลัมน์ identity
            print(f"insert into {t} ({collist}) overriding system value values ({vals});")
        total += len(rows)

    # ตัวนับเลขอัตโนมัติต้องขยับตามของที่เพิ่งใส่ ไม่งั้นแถวใหม่จะชน id เดิม
    print("\n-- ขยับตัวนับ id ให้เลยของที่ย้ายมา")
    for t in TABLES:
        print(
            f"select setval(pg_get_serial_sequence('{t}', 'id'), "
            f"coalesce((select max(id) from {t}), 1), true) "
            f"where pg_get_serial_sequence('{t}', 'id') is not null;"
        )
    print("\ncommit;")
    print(f"-- รวม {total} แถว", file=sys.stderr)


if __name__ == "__main__":
    main()
