#!/usr/bin/env python3
"""สำรองข้อมูล Farmy Voice จาก Supabase ออกมาเป็นไฟล์ JSON (และกู้กลับได้)

ทำไมต้องมี: ข้อมูลทั้งหมดอยู่ที่ Supabase ที่เดียว ถ้าเผลอลบหรือบัญชีมีปัญหาคือหายหมด
ไฟล์ที่ได้เป็น JSON ธรรมดา เปิดอ่านได้ ใส่กลับได้ ไม่ผูกกับเครื่องมือใด

สำรอง:
    python deploy/backup-db.py                      # → backups/2026-09-25/*.json
    python deploy/backup-db.py --out D:/farmy-backup

กู้คืน (ระวัง: ใส่ข้อมูลกลับเข้าตารางที่ระบุ):
    python deploy/backup-db.py --restore backups/2026-09-25 --tables vaccine_log --yes

ต้องมี SUPABASE_URL และ SUPABASE_SERVICE_KEY ใน backend/.env (หรือใน environment)
"""
import argparse
import io
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# ทุกตารางที่ระบบใช้ — เพิ่มตารางใหม่ต้องมาเพิ่มที่นี่ด้วย ไม่งั้นจะไม่ถูกสำรอง
TABLES = [
    "weather_readings", "weather_predictions",
    "pig_health_log",
    "vaccine_log", "vaccine_schedule", "vaccine_products", "vaccine_followup",
    "pig_batches", "vaccine_programs",
    "vet_posts", "vet_comments",
    "farm_tasks",
    "knowledge_docs", "knowledge_chunks",
    "admin_users",
]
PAGE = 1000  # PostgREST ส่งทีละไม่เกินนี้ ต้องไล่ทีละหน้า


def load_env() -> tuple[str, str]:
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_KEY", "")
    env_file = ROOT / "backend" / ".env"
    if (not url or not key) and env_file.exists():
        for line in io.open(env_file, encoding="utf-8"):
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k, v = k.strip(), v.strip()
            url = url or (v if k == "SUPABASE_URL" else "")
            key = key or (v if k == "SUPABASE_SERVICE_KEY" else "")
    if not url or not key:
        sys.exit("ไม่พบ SUPABASE_URL / SUPABASE_SERVICE_KEY (ดูที่ backend/.env)")
    return url.rstrip("/"), key


def request(url: str, key: str, path: str, method: str = "GET", body=None, extra=None) -> tuple[int, bytes, dict]:
    headers = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    headers.update(extra or {})
    data = json.dumps(body, ensure_ascii=False).encode() if body is not None else None
    req = urllib.request.Request(f"{url}/rest/v1/{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, r.read(), dict(r.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read(), dict(e.headers or {})


def dump_table(url: str, key: str, table: str) -> list[dict] | None:
    """ดึงทั้งตารางแบบไล่ทีละหน้า — None = ไม่มีตารางนี้"""
    rows: list[dict] = []
    start = 0
    while True:
        q = urllib.parse.urlencode({"select": "*", "limit": PAGE, "offset": start})
        code, raw, _ = request(url, key, f"{table}?{q}")
        if code == 404:
            return None
        if code >= 400:
            print(f"  ! {table}: อ่านไม่ได้ ({code}) {raw[:120].decode(errors='ignore')}")
            return rows or None
        batch = json.loads(raw.decode())
        rows.extend(batch)
        if len(batch) < PAGE:
            return rows
        start += PAGE


def backup(out_dir: Path, skip_users: bool = False) -> None:
    url, key = load_env()
    out_dir.mkdir(parents=True, exist_ok=True)
    summary = {}
    # admin_users มีรหัสผ่านที่เข้ารหัสไว้ — ถ้าจะเอาไฟล์ไปเก็บที่อื่น (คลาวด์/ที่แชร์กัน) ให้ข้ามตารางนี้
    tables = [t for t in TABLES if not (skip_users and t == "admin_users")]
    for t in tables:
        rows = dump_table(url, key, t)
        if rows is None:
            print(f"  - {t:20} ไม่มีตารางนี้ (ข้าม)")
            continue
        io.open(out_dir / f"{t}.json", "w", encoding="utf-8").write(
            json.dumps(rows, ensure_ascii=False, indent=1)
        )
        summary[t] = len(rows)
        print(f"  ✓ {t:20} {len(rows):>6} แถว")
    io.open(out_dir / "_summary.json", "w", encoding="utf-8").write(
        json.dumps({"date": date.today().isoformat(), "tables": summary}, ensure_ascii=False, indent=1)
    )
    total = sum(summary.values())
    size = sum(f.stat().st_size for f in out_dir.glob("*.json")) / 1024
    print(f"\nสำรองเสร็จ: {len(summary)} ตาราง {total} แถว ({size:.0f} KB)\n{out_dir}")


def restore(src: Path, tables: list[str], yes: bool) -> None:
    url, key = load_env()
    files = [src / f"{t}.json" for t in tables] if tables else sorted(src.glob("*.json"))
    files = [f for f in files if f.name != "_summary.json" and f.exists()]
    if not files:
        sys.exit("ไม่พบไฟล์สำรองที่จะกู้คืน")
    print("จะใส่ข้อมูลกลับเข้าตาราง:")
    for f in files:
        print(f"  {f.stem:20} {len(json.load(io.open(f, encoding='utf-8')))} แถว")
    if not yes and input("\nยืนยันหรือไม่ (พิมพ์ yes): ").strip() != "yes":
        sys.exit("ยกเลิก")
    for f in files:
        rows = json.load(io.open(f, encoding="utf-8"))
        if not rows:
            continue
        ok = 0
        # ใส่ทีละก้อน และไม่ทับของเดิม (id ซ้ำจะข้ามไป) กันเขียนทับข้อมูลที่ยังดีอยู่
        for i in range(0, len(rows), 200):
            chunk = rows[i:i + 200]
            code, raw, _ = request(url, key, f.stem, "POST", chunk,
                                   {"Prefer": "resolution=ignore-duplicates,return=minimal"})
            if code >= 400:
                print(f"  ! {f.stem}: {code} {raw[:160].decode(errors='ignore')}")
                break
            ok += len(chunk)
        print(f"  ✓ {f.stem:20} ใส่กลับ {ok} แถว")


def main() -> None:
    ap = argparse.ArgumentParser(description="สำรอง/กู้คืนข้อมูล Farmy Voice")
    ap.add_argument("--out", default=str(ROOT / "backups"), help="โฟลเดอร์เก็บไฟล์สำรอง")
    ap.add_argument("--restore", metavar="DIR", help="กู้คืนจากโฟลเดอร์สำรอง")
    ap.add_argument("--tables", nargs="*", help="เลือกเฉพาะบางตาราง (ใช้กับ --restore)")
    ap.add_argument("--yes", action="store_true", help="ไม่ต้องถามยืนยันตอนกู้คืน")
    ap.add_argument("--no-users", action="store_true", help="ไม่สำรองตารางผู้ใช้ (ใช้เมื่อจะเอาไฟล์ไปเก็บที่อื่น)")
    a = ap.parse_args()
    if a.restore:
        restore(Path(a.restore), a.tables or [], a.yes)
    else:
        backup(Path(a.out) / date.today().isoformat(), a.no_users)


if __name__ == "__main__":
    main()
