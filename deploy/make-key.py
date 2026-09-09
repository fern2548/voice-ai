"""สร้างกุญแจ service_role จากรหัสลับใน .env

    python make-key.py

เอาค่าที่ได้ไปใส่ SUPABASE_SERVICE_KEY ใน .env
ต้องรันใหม่ทุกครั้งที่เปลี่ยน JWT_SECRET ไม่งั้นกุญแจเก่าจะใช้ไม่ได้
"""
import base64, hmac, hashlib, json, time, io, os, sys

def read_env(path=".env"):
    if not os.path.exists(path):
        sys.exit("ไม่พบไฟล์ .env — คัดลอกจาก .env.example ก่อน")
    out = {}
    for line in io.open(path, encoding="utf-8"):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            out[k.strip()] = v.strip()
    return out

def make(secret: str, role: str, years: int = 10) -> str:
    b64 = lambda d: base64.urlsafe_b64encode(d).decode().rstrip("=")
    now = int(time.time())
    head = b64(json.dumps({"alg": "HS256", "typ": "JWT"}, separators=(",", ":")).encode())
    body = b64(json.dumps({"role": role, "iss": "farmy", "iat": now,
                           "exp": now + 31536000 * years}, separators=(",", ":")).encode())
    msg = f"{head}.{body}".encode()
    sig = b64(hmac.new(secret.encode(), msg, hashlib.sha256).digest())
    return f"{head}.{body}.{sig}"

if __name__ == "__main__":
    env = read_env()
    secret = env.get("JWT_SECRET", "")
    if len(secret) < 32:
        sys.exit("JWT_SECRET ต้องยาวอย่างน้อย 32 ตัวอักษร")
    print("SUPABASE_SERVICE_KEY=" + make(secret, "service_role"))
    print()
    print("คัดลอกบรรทัดบนไปแทนที่ใน .env แล้วสั่ง docker compose up -d --build")
