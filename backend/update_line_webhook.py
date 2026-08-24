"""ตั้งค่า LINE webhook ให้ชี้มาที่ URL สาธารณะปัจจุบัน

ใช้เมื่อไหร่: ทุกครั้งที่ URL ของ tunnel เปลี่ยน (Cloudflare quick tunnel สุ่ม URL ใหม่ทุกครั้งที่รัน)

วิธีใช้:
    python update_line_webhook.py https://xxxx.trycloudflare.com

สคริปต์จะ
  1. อัปเดต PUBLIC_BASE_URL ในไฟล์ .env ให้ (ใช้ประกอบลิงก์ไฟล์ที่ส่งเข้า LINE)
  2. ตั้ง webhook endpoint ที่ฝั่ง LINE
  3. พยายามเปิด active
  4. ยิง test เพื่อดูว่า LINE ต่อมาถึงเครื่องเราได้จริงไหม
"""

import io
import os
import re
import sys

import httpx
from dotenv import load_dotenv

ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")


def update_env(base_url: str) -> None:
    """เขียนทับค่า PUBLIC_BASE_URL ในไฟล์ .env โดยไม่แตะบรรทัดอื่น"""
    text = io.open(ENV_PATH, encoding="utf-8").read() if os.path.exists(ENV_PATH) else ""
    line = f"PUBLIC_BASE_URL={base_url}"
    if re.search(r"^PUBLIC_BASE_URL=.*$", text, flags=re.M):
        text = re.sub(r"^PUBLIC_BASE_URL=.*$", line, text, flags=re.M)
    else:
        text = text.rstrip("\n") + "\n" + line + "\n"
    io.open(ENV_PATH, "w", encoding="utf-8").write(text)
    print(f"[1] .env -> {line}")


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 1

    base_url = sys.argv[1].rstrip("/")
    if not base_url.startswith("https://"):
        print("ต้องเป็น https:// เท่านั้น LINE ไม่รับ http")
        return 1

    update_env(base_url)
    load_dotenv(ENV_PATH, override=True)

    token = os.getenv("LINE_CHANNEL_ACCESS_TOKEN", "")
    if not token:
        print("ไม่พบ LINE_CHANNEL_ACCESS_TOKEN ใน .env")
        return 1

    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    endpoint = f"{base_url}/line/webhook"

    r = httpx.put(
        "https://api.line.me/v2/bot/channel/webhook/endpoint",
        headers=headers,
        json={"endpoint": endpoint},
        timeout=20,
    )
    print(f"[2] ตั้ง endpoint -> HTTP {r.status_code} {r.text}")

    r = httpx.put(
        "https://api.line.me/v2/bot/channel/webhook/endpoint",
        headers=headers,
        json={"endpoint": endpoint, "active": True},
        timeout=20,
    )
    print(f"[3] เปิด active   -> HTTP {r.status_code} {r.text}")

    r = httpx.get(
        "https://api.line.me/v2/bot/channel/webhook/endpoint", headers=headers, timeout=20
    )
    print(f"[4] สถานะจริง     -> {r.text}")

    # LINE ยิงทดสอบมาที่เครื่องเราจริง ๆ บอกได้ว่าต่อถึงหรือไม่
    r = httpx.post(
        "https://api.line.me/v2/bot/channel/webhook/test",
        headers=headers,
        json={"endpoint": endpoint},
        timeout=30,
    )
    print(f"[5] LINE ทดสอบต่อ -> HTTP {r.status_code} {r.text}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
