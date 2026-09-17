"""คัดลอกข้อมูลจาก Supabase คลาวด์ มาเป็นไฟล์ SQL สำหรับใส่ฐานข้อมูลบนเซิร์ฟเวอร์เรา

    python migrate-from-cloud.py --url https://xxxx.supabase.co --key <service_role key> --out /tmp/farmy-data.sql
    psql -d farmy -f /tmp/farmy-data.sql

ทำผ่าน REST API ของ Supabase (ไม่ต้องใช้ pg_dump ต่อคลาวด์ ซึ่งบางกล่องต่อพอร์ต 5432 ออกไม่ได้)
ดึงทีละ 1000 แถวจนหมด แล้วเขียนเป็น insert ที่ใส่ซ้ำได้ (แถวที่มีอยู่แล้วจะข้าม)
"""
import argparse, json, sys
import httpx

# ตารางทั้งหมดใน deploy/db/02-schema.sql พร้อมคีย์หลักที่ใช้เรียงตอนดึงทีละหน้า
TABLES = [
    ("weather_readings", "id"),
    ("weather_predictions", "id"),
    ("pig_health_log", "id"),
    ("vaccine_log", "id"),
    ("vaccine_schedule", "vaccine_name"),
    ("admin_users", "id"),
    ("vaccine_followup", "id"),
    ("knowledge_docs", "id"),
    ("knowledge_chunks", "id"),
]
PAGE = 1000


def sql_value(v):
    """แปลงค่าจาก JSON เป็นตัวอักษร SQL — ใช้ dollar-quote จะได้ไม่ต้องกังวลเรื่อง ' ในข้อความ"""
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return repr(v)
    if isinstance(v, (dict, list)):
        return "$fv$" + json.dumps(v, ensure_ascii=False).replace("$fv$", "") + "$fv$::jsonb"
    return "$fv$" + str(v).replace("$fv$", "") + "$fv$"


def fetch_all(client, url, key, table, pk):
    rows, offset = [], 0
    while True:
        r = client.get(
            f"{url.rstrip('/')}/rest/v1/{table}",
            params={"select": "*", "order": f"{pk}.asc", "offset": offset, "limit": PAGE},
            headers={"apikey": key, "Authorization": f"Bearer {key}"},
        )
        r.raise_for_status()
        page = r.json()
        rows.extend(page)
        if len(page) < PAGE:
            return rows
        offset += PAGE


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", required=True)
    ap.add_argument("--key", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()

    out = open(a.out, "w", encoding="utf-8")
    out.write("-- ข้อมูลจาก Supabase คลาวด์ — สร้างโดย migrate-from-cloud.py\nbegin;\n")
    total = 0
    with httpx.Client(timeout=60) as client:
        for table, pk in TABLES:
            try:
                rows = fetch_all(client, a.url, a.key, table, pk)
            except httpx.HTTPStatusError as e:
                print(f"  {table}: ดึงไม่ได้ ({e.response.status_code}) — ข้าม", file=sys.stderr)
                continue
            print(f"  {table}: {len(rows)} แถว", file=sys.stderr)
            total += len(rows)
            if not rows:
                continue
            cols = list(rows[0].keys())
            col_sql = ", ".join(f'"{c}"' for c in cols)
            for row in rows:
                vals = ", ".join(sql_value(row.get(c)) for c in cols)
                # overriding system value = ยอมให้ใส่ id เดิมจากคลาวด์ ไม่ให้ฐานข้อมูลออกเลขใหม่
                # on conflict do nothing = รันซ้ำได้ ไม่ใส่ซ้ำ
                ov = "overriding system value " if pk == "id" else ""
                out.write(f'insert into "{table}" ({col_sql}) {ov}values ({vals}) on conflict do nothing;\n')
            if pk == "id":
                # ให้เลขรันต่อจากเลขสูงสุดของคลาวด์ ไม่งั้นแถวใหม่จะชนกับของเก่า
                out.write(f"select setval(pg_get_serial_sequence('{table}', 'id'), coalesce(max(id), 1)) from \"{table}\";\n")
    out.write("commit;\n")
    out.close()
    print(f"รวม {total} แถว → {a.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
