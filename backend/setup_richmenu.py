"""ติดตั้ง Rich Menu ของ LINE (เมนูปุ่มด้านล่างหน้าแชท)

รันครั้งเดียวหลังตั้งค่า LINE_CHANNEL_ACCESS_TOKEN แล้ว:
    python setup_richmenu.py

จะสร้างเมนู 4 ปุ่ม: รายงานวัคซีน / สรุปฟาร์มวันนี้ / หมูป่วยวันนี้ / เปิดเว็บ
แล้วตั้งเป็นเมนูเริ่มต้นให้ทุกคนที่แอดบอทเป็นเพื่อน
"""
import io
import os

import httpx
from dotenv import load_dotenv
from PIL import Image, ImageDraw, ImageFont

load_dotenv(override=True)

TOKEN = os.environ["LINE_CHANNEL_ACCESS_TOKEN"]
PUBLIC_BASE_URL = os.environ.get("PUBLIC_BASE_URL", "").rstrip("/")
FONT_DIR = os.path.join(os.path.dirname(__file__), "fonts")
F_BOLD = os.path.join(FONT_DIR, "tahomabd.ttf")
F_REG = os.path.join(FONT_DIR, "tahoma.ttf")

W, H = 2500, 843  # ขนาดริชเมนูแบบครึ่งจอ (compact) ที่ LINE รองรับ
CELL_W = W // 4

BUTTONS = [
    ("รายงานวัคซีน", "ดูประวัติ + PDF", "#2563eb", "vaccine_report"),
    ("สรุปฟาร์มวันนี้", "อากาศ + สุขภาพ", "#7c3aed", "farm_summary"),
    ("หมูป่วยวันนี้", "จำนวนล่าสุด", "#db2777", "pig_sick"),
    ("เปิดเว็บฟาร์มมี่", "จัดการข้อมูล", "#0891b2", None),
]


def build_image() -> bytes:
    img = Image.new("RGB", (W, H), "#0b1020")
    d = ImageDraw.Draw(img)
    f_title = ImageFont.truetype(F_BOLD, 74)
    f_sub = ImageFont.truetype(F_REG, 46)

    for i, (title, sub, color, _) in enumerate(BUTTONS):
        x0 = i * CELL_W
        d.rectangle([x0 + 14, 14, x0 + CELL_W - 14, H - 14], fill=color)
        # ข้อความจัดกลางในแต่ละช่อง
        tb = d.textbbox((0, 0), title, font=f_title)
        sb = d.textbbox((0, 0), sub, font=f_sub)
        cx = x0 + CELL_W // 2
        d.text((cx - (tb[2] - tb[0]) // 2, H // 2 - 90), title, font=f_title, fill="#ffffff")
        d.text((cx - (sb[2] - sb[0]) // 2, H // 2 + 20), sub, font=f_sub, fill="#e5e7eb")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def main() -> None:
    areas = []
    for i, (title, _, _, data) in enumerate(BUTTONS):
        action = (
            {"type": "postback", "data": data, "displayText": title}
            if data
            else {"type": "uri", "uri": PUBLIC_BASE_URL or "https://line.me"}
        )
        areas.append({
            "bounds": {"x": i * CELL_W, "y": 0, "width": CELL_W, "height": H},
            "action": action,
        })

    headers = {"Authorization": f"Bearer {TOKEN}"}

    # 1) ลบเมนูเดิมทิ้งก่อน กันสร้างซ้ำซ้อนทุกครั้งที่รัน
    existing = httpx.get("https://api.line.me/v2/bot/richmenu/list", headers=headers, timeout=20)
    for rm in existing.json().get("richmenus", []) if existing.status_code == 200 else []:
        httpx.delete(f"https://api.line.me/v2/bot/richmenu/{rm['richMenuId']}", headers=headers, timeout=20)

    # 2) สร้างเมนูใหม่
    res = httpx.post(
        "https://api.line.me/v2/bot/richmenu",
        headers={**headers, "Content-Type": "application/json"},
        json={
            "size": {"width": W, "height": H},
            "selected": True,
            "name": "Farmy Voice Menu",
            "chatBarText": "เมนูฟาร์มมี่",
            "areas": areas,
        },
        timeout=20,
    )
    res.raise_for_status()
    rid = res.json()["richMenuId"]
    print("created richmenu:", rid)

    # 3) อัปโหลดรูปเมนู
    up = httpx.post(
        f"https://api-data.line.me/v2/bot/richmenu/{rid}/content",
        headers={**headers, "Content-Type": "image/png"},
        content=build_image(),
        timeout=60,
    )
    up.raise_for_status()
    print("uploaded image ok")

    # 4) ตั้งเป็นเมนูเริ่มต้นของทุกคน
    setdef = httpx.post(
        f"https://api.line.me/v2/bot/user/all/richmenu/{rid}", headers=headers, timeout=20
    )
    setdef.raise_for_status()
    print("set as default ok")
    print("DONE — เปิดแอป LINE แล้วดูเมนูด้านล่างหน้าแชทได้เลย")


if __name__ == "__main__":
    main()
