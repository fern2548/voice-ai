"""
Weather Station AI - FastAPI backend

Endpoints (แปลงมาจาก weather_predict.py เดิม):
  GET  /weather   -> ค่าปัจจุบันจากเซนเซอร์ (ล่าสุดที่ Node-RED ส่งเข้ามา)
  GET  /history   -> ข้อมูลย้อนหลัง 1 ชั่วโมง
  GET  /predict   -> ตารางทำนายสภาพอากาศ
  POST /ask       -> ถาม-ตอบเรื่องสภาพอากาศ (Gemini -> Ollama local -> rule-based)
  POST /ingest    -> Node-RED ยิงค่าเซนเซอร์เข้ามาที่นี่

รันด้วย:  python main.py   (หรือ uvicorn main:app --host 0.0.0.0 --port 8000 --reload)
  -> ใช้พอร์ต 8000 เสมอ ให้ตรงกับ Vite proxy ฝั่ง frontend
"""
import base64
import hashlib
import hmac
import io
import json
import os
import re
import secrets
from datetime import date, datetime, timedelta, timezone
from typing import Optional

import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fpdf import FPDF
from pydantic import BaseModel
from supabase import create_client, Client

load_dotenv(override=True)  # ให้ค่าใน .env ชนะเสมอ (สำคัญตอน uvicorn --reload อ่านค่าใหม่)

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
INGEST_TOKEN = os.environ["INGEST_TOKEN"]
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# ---------- LLM (Gemini) ----------
# ถ้ามี GEMINI_API_KEY จะใช้ Gemini ตอบแบบครอบคลุม
# ถ้าไม่มี จะ fallback ไปใช้ logic แบบ rule-based ด้านล่างแทน
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.1-flash-lite")
_llm = None
if GEMINI_API_KEY:
    try:
        from google import genai
        _llm = genai.Client(api_key=GEMINI_API_KEY)
    except Exception as e:  # ไม่ให้ startup ล้มถ้า import/init มีปัญหา
        print(f"[warn] ไม่สามารถเริ่ม Gemini client ได้: {e}")
        _llm = None

# ---------- LLM (Ollama, local) ----------
# ชั้นกลางระหว่าง Gemini กับ rule-based: ถ้า Gemini ไม่มีคีย์/ตอบไม่สำเร็จ ลอง Ollama
# ก่อน (รันในเครื่องเอง ไม่มีค่าใช้จ่าย/ไม่จำกัดโควตา) ถ้า Ollama ต่อไม่ได้ (ยังไม่ได้ติดตั้ง/ปิดอยู่)
# ค่อย fallback ไป rule-based เป็นด่านสุดท้าย
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "llama3.2:3b")

# ---------- LINE Messaging API ----------
# ใช้ broadcast (ส่งหาทุกคนที่แอด bot เป็นเพื่อน) เพราะฟาร์มนี้มีผู้ใช้คนเดียว/ทีมเล็ก
# ไม่ต้องรู้ userId ล่วงหน้า แค่มี Channel Access Token ก็พอ
LINE_CHANNEL_ACCESS_TOKEN = os.environ.get("LINE_CHANNEL_ACCESS_TOKEN", "")

# URL สาธารณะของ backend นี้ (เช่น https://your-app.com) ใช้ประกอบลิงก์ไฟล์ PDF ที่ส่งเข้า LINE
# LINE Bot แนบไฟล์ตรง ๆ ไม่ได้ ต้องส่งเป็นลิงก์ให้กดดาวน์โหลดแทน — ตอนนี้ยังว่างเพราะรันแค่ localhost
# (localhost เข้าจากมือถือ/อุปกรณ์อื่นไม่ได้) พอ deploy ขึ้นเซิร์ฟเวอร์จริงแล้วค่อยใส่ URL จริงตรงนี้ใน .env
PUBLIC_BASE_URL = os.environ.get("PUBLIC_BASE_URL", "").rstrip("/")


def _send_line_broadcast(text: str) -> bool:
    """ส่งข้อความ text ไปหาทุกคนที่แอด LINE Official Account นี้เป็นเพื่อน
    คืน True ถ้าส่งสำเร็จ, False ถ้าส่งไม่สำเร็จ (ยังไม่ได้ตั้งค่า token/token ผิด/เน็ตมีปัญหา)
    """
    if not LINE_CHANNEL_ACCESS_TOKEN:
        print("[warn] ยังไม่ได้ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN")
        return False
    try:
        resp = httpx.post(
            "https://api.line.me/v2/bot/message/broadcast",
            headers={
                "Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}",
                "Content-Type": "application/json",
            },
            json={"messages": [{"type": "text", "text": text[:5000]}]},  # LINE จำกัดความยาวข้อความ
            timeout=15,
        )
        if resp.status_code != 200:
            print(f"[warn] LINE ส่งไม่สำเร็จ ({resp.status_code}): {resp.text}")
            return False
        return True
    except Exception as e:
        print(f"[warn] LINE ส่งไม่สำเร็จ: {e}")
        return False


LINE_CHANNEL_SECRET = os.environ.get("LINE_CHANNEL_SECRET", "")


def _line_reply(reply_token: str, messages: list[dict]) -> bool:
    """ตอบกลับข้อความที่ผู้ใช้ทักมาใน LINE (ใช้ reply token ที่ LINE ส่งมากับ webhook)"""
    if not LINE_CHANNEL_ACCESS_TOKEN:
        return False
    try:
        resp = httpx.post(
            "https://api.line.me/v2/bot/message/reply",
            headers={
                "Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}",
                "Content-Type": "application/json",
            },
            json={"replyToken": reply_token, "messages": messages[:5]},
            timeout=20,
        )
        if resp.status_code != 200:
            print(f"[warn] LINE reply ไม่สำเร็จ ({resp.status_code}): {resp.text}")
            return False
        return True
    except Exception as e:
        print(f"[warn] LINE reply ไม่สำเร็จ: {e}")
        return False


def _send_line_messages(messages: list[dict]) -> bool:
    """ส่งหลายข้อความ (เช่น รูป + ข้อความ) ในครั้งเดียว — LINE ให้ได้สูงสุด 5 ข้อความต่อครั้ง"""
    if not LINE_CHANNEL_ACCESS_TOKEN:
        print("[warn] ยังไม่ได้ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN")
        return False
    try:
        resp = httpx.post(
            "https://api.line.me/v2/bot/message/broadcast",
            headers={
                "Authorization": f"Bearer {LINE_CHANNEL_ACCESS_TOKEN}",
                "Content-Type": "application/json",
            },
            json={"messages": messages[:5]},
            timeout=20,
        )
        if resp.status_code != 200:
            print(f"[warn] LINE ส่งไม่สำเร็จ ({resp.status_code}): {resp.text}")
            return False
        return True
    except Exception as e:
        print(f"[warn] LINE ส่งไม่สำเร็จ: {e}")
        return False


def verify_ingest_token(x_ingest_token: str = Header(...)) -> None:
    if x_ingest_token != INGEST_TOKEN:
        raise HTTPException(status_code=401, detail="invalid ingest token")

# ---------- Admin auth (หลายผู้ใช้ เก็บใน DB) ----------
# เก็บ password เป็น hash+salt เสมอ (PBKDF2) ไม่เก็บ plain text ไว้ในตาราง admin_users
# ล็อกอินสำเร็จ -> ได้ token แบบสุ่ม เก็บไว้ใน memory (หาย/ต้อง login ใหม่ทุกครั้งที่ restart backend)
_BOOTSTRAP_ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")  # ใช้แค่ตอนสร้างผู้ใช้ admin คนแรกครั้งเดียว
_ADMIN_TOKENS: dict[str, str] = {}  # token -> username


def _hash_password(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000).hex()


def _create_admin_user(username: str, password: str) -> None:
    salt = secrets.token_hex(16)
    supabase.table("admin_users").insert({
        "username": username,
        "password_hash": _hash_password(password, salt),
        "password_salt": salt,
    }).execute()


def _verify_admin_password(username: str, password: str) -> bool:
    try:
        res = supabase.table("admin_users").select("*").eq("username", username).limit(1).execute()
    except Exception as e:
        # ยังไม่ได้สร้างตาราง admin_users (ยังไม่ได้รัน schema.sql) -> fallback ใช้รหัสผ่านเดียวจาก .env ไปก่อน
        # กันเว็บล็อกตัวเองจนเข้าไม่ได้เลย ระบบหลายผู้ใช้จะเริ่มทำงานทันทีที่สร้างตารางแล้ว restart
        print(f"[warn] อ่านตาราง admin_users ไม่ได้ ใช้ ADMIN_PASSWORD จาก .env แทน: {e}")
        return bool(_BOOTSTRAP_ADMIN_PASSWORD) and password == _BOOTSTRAP_ADMIN_PASSWORD
    if not res.data:
        return False
    u = res.data[0]
    return _hash_password(password, u["password_salt"]) == u["password_hash"]


def _bootstrap_admin_user() -> None:
    """สร้างผู้ใช้ admin คนแรกอัตโนมัติจาก ADMIN_PASSWORD ใน .env ถ้ายังไม่มีผู้ใช้เลยในระบบ
    ทำครั้งเดียวตอน backend เริ่มทำงาน กันของเดิม (ตั้งรหัสผ่านเดียว) ใช้ต่อไม่ได้หลังอัปเกรด
    """
    try:
        count = supabase.table("admin_users").select("id", count="exact").execute().count or 0
        if count == 0 and _BOOTSTRAP_ADMIN_PASSWORD:
            _create_admin_user("admin", _BOOTSTRAP_ADMIN_PASSWORD)
            print("[info] สร้างผู้ใช้ admin เริ่มต้น (username: admin) จาก ADMIN_PASSWORD ใน .env แล้ว")
    except Exception as e:
        print(f"[warn] bootstrap admin user ไม่สำเร็จ: {e}")


def verify_admin_token(x_admin_token: str = Header(...)) -> None:
    if x_admin_token not in _ADMIN_TOKENS:
        raise HTTPException(status_code=401, detail="กรุณาเข้าสู่ระบบ admin ก่อน")


app = FastAPI(title="Weather Station AI")
_bootstrap_admin_user()

# ---------- PDF export (ภาษาไทย) ----------
# fpdf2 ไม่มีฟอนต์ไทยติดมาให้ ต้องฝังฟอนต์เอง ไม่งั้นตัวอักษรไทยจะไม่ขึ้น
#
# ใช้ Sarabun ไม่ใช่ Tahoma เพราะ Tahoma เป็นลิขสิทธิ์ Microsoft แจกต่อไม่ได้
# ส่วน Sarabun อยู่ใต้ SIL Open Font License แจกต่อได้ (ดู fonts/OFL.txt)
# สำคัญตอน deploy: repo เป็น public และไฟล์ฟอนต์ต้องขึ้นไปด้วยเพื่อให้เซิร์ฟเวอร์สร้าง PDF ไทยได้
_FONT_DIR = os.path.join(os.path.dirname(__file__), "fonts")
_FONT_REGULAR = os.path.join(_FONT_DIR, "Sarabun-Regular.ttf")
_FONT_BOLD = os.path.join(_FONT_DIR, "Sarabun-Bold.ttf")


def _new_thai_pdf() -> FPDF:
    pdf = FPDF()
    pdf.add_page()
    pdf.add_font("Thai", "", _FONT_REGULAR)
    pdf.add_font("Thai", "B", _FONT_BOLD)
    pdf.set_font("Thai", size=14)
    return pdf


@app.on_event("startup")
def _warm_up_ollama():
    """โหลดโมเดล Ollama เข้า RAM ล่วงหน้าตอน backend เริ่มทำงาน (โหลดครั้งแรกช้ามาก เป็นสิบวินาที)
    ทำแบบ fire-and-forget ไม่ block การ start server ถ้า Ollama ยังไม่ได้ติดตั้ง/ปิดอยู่ ก็แค่เงียบไป
    """
    import threading

    def _run():
        try:
            httpx.post(
                f"{OLLAMA_URL}/api/chat",
                json={
                    "model": OLLAMA_MODEL,
                    "messages": [{"role": "user", "content": "hi"}],
                    "stream": False,
                    "keep_alive": "30m",
                },
                timeout=90,
            )
            print(f"[info] Ollama ({OLLAMA_MODEL}) พร้อมใช้งานแล้ว")
        except Exception as e:
            print(f"[info] Ollama warm-up ข้าม (ยังไม่ได้ติดตั้ง/ปิดอยู่): {e}")

    threading.Thread(target=_run, daemon=True).start()

# อนุญาตให้ frontend เรียกได้
# ตอน deploy จริง frontend จะอยู่คนละโดเมนกับ backend -> ตั้ง ALLOWED_ORIGINS เป็นโดเมนของเว็บ
# (คั่นด้วย , ได้หลายอัน) ถ้าไม่ตั้ง จะเปิดกว้าง "*" เหมือนเดิมเพื่อให้ dev สะดวก
_ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- ล็อกทั้งเว็บด้วยรหัสผ่าน admin ----------
# ไม่ใช่แค่ปุ่มแก้ไขข้อมูล — ทุก endpoint ต้องมี X-Admin-Token ที่ถูกต้องก่อน ยกเว้นที่อยู่ใน allowlist
# (เผื่อ deploy ขึ้นเซิร์ฟเวอร์จริงแล้วมี URL สาธารณะ กันคนนอกเข้ามาดูข้อมูลฟาร์มได้เลยโดยไม่ต้องรู้รหัส)
_PUBLIC_PATHS = {"/admin/login", "/health", "/line/webhook"}  # webhook: LINE เรียกเข้ามาเอง ตรวจด้วยลายเซ็นแทน
# /ingest = อุปกรณ์เซนเซอร์/Node-RED ใช้ INGEST_TOKEN ของตัวเองแยกต่างหากอยู่แล้ว
# /r      = ลิงก์รายงานสำหรับปุ่มริชเมนู LINE (ดูหมายเหตุที่ PUBLIC_REPORT_KEY ด้านล่าง)
_PUBLIC_PREFIXES = ("/ingest", "/r/")

# ---------- ลิงก์รายงานถาวรสำหรับปุ่มริชเมนู LINE ----------
# ปุ่มริชเมนูที่สร้างจากหน้า LINE OA Manager ใส่ได้แค่ "ลิงก์" ธรรมดา
# แนบ token ที่หมดอายุไม่ได้ (ลิงก์ถูกฝังตายตัวในเมนู) เลยต้องมีลิงก์ที่ใช้ได้ตลอด
#
# ความปลอดภัย: ใครถือลิงก์นี้ก็เปิดดูข้อมูลฟาร์มได้โดยไม่ต้องล็อกอิน
# จึงใส่คีย์สุ่มยาวไว้ใน path (เดาไม่ได้) แทนการเปิดโล่ง
# ถ้าลิงก์หลุด ให้เปลี่ยนค่า PUBLIC_REPORT_KEY ใน .env แล้วรีสตาร์ท ลิงก์เก่าจะใช้ไม่ได้ทันที
PUBLIC_REPORT_KEY = os.environ.get("PUBLIC_REPORT_KEY", "")

# ---------- ลิงก์ดาวน์โหลดชั่วคราว (สำหรับส่งเข้า LINE) ----------
# LINE แนบไฟล์ตรง ๆ ไม่ได้ ต้องส่งเป็นลิงก์ให้กด แต่ลิงก์ที่กดจากมือถือจะไม่มี X-Admin-Token
# เลยออก token ดาวน์โหลดแบบใช้ชั่วคราว ใส่ไปใน URL แทน (หมดอายุเองตามเวลา กันลิงก์หลุดแล้วโดนโหลดตลอดไป)
DOWNLOAD_TOKEN_TTL_MIN = 60
_DOWNLOAD_TOKENS: dict[str, datetime] = {}


def _issue_download_token() -> str:
    now = datetime.now(timezone.utc)
    for t, exp in list(_DOWNLOAD_TOKENS.items()):  # เก็บกวาดอันที่หมดอายุแล้ว
        if exp < now:
            _DOWNLOAD_TOKENS.pop(t, None)
    token = secrets.token_urlsafe(24)
    _DOWNLOAD_TOKENS[token] = now + timedelta(minutes=DOWNLOAD_TOKEN_TTL_MIN)
    return token


def _valid_download_token(token: Optional[str]) -> bool:
    if not token:
        return False
    exp = _DOWNLOAD_TOKENS.get(token)
    return exp is not None and exp >= datetime.now(timezone.utc)


@app.middleware("http")
async def _require_admin_login(request, call_next):
    path = request.url.path
    if (
        request.method == "OPTIONS"  # CORS preflight ต้องผ่านได้เสมอ ไม่งั้นเบราว์เซอร์เรียก API ไม่ได้เลย
        or path in _PUBLIC_PATHS
        or path.startswith(_PUBLIC_PREFIXES)
    ):
        return await call_next(request)

    # ลิงก์ดาวน์โหลดที่แนบ token ชั่วคราวมา (เปิดจาก LINE/มือถือได้โดยไม่ต้องล็อกอิน)
    if path.startswith("/export/") and _valid_download_token(request.query_params.get("t")):
        return await call_next(request)

    token = request.headers.get("x-admin-token")
    if token not in _ADMIN_TOKENS:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=401, content={"detail": "กรุณาเข้าสู่ระบบ admin ก่อน"})

    return await call_next(request)


# ---------- โมเดลข้อมูล ----------
class Weather(BaseModel):
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    windspeed: Optional[float] = None
    rainfall: Optional[float] = None
    light: Optional[float] = None


class Prediction(BaseModel):
    predicted_for: Optional[datetime] = None
    temperature_pred: Optional[float] = None
    humidity_pred: Optional[float] = None
    windspeed_pred: Optional[float] = None
    rainfall_pred: Optional[float] = None
    light_pred: Optional[float] = None


class PigHealth(BaseModel):
    log_date: date
    sick_count: int
    total_count: Optional[int] = None
    note: Optional[str] = None


class VaccineLog(BaseModel):
    log_date: date
    vaccine_name: Optional[str] = None
    barn_no: Optional[str] = None
    pen_no: Optional[str] = None
    pig_count: Optional[int] = None
    injector: Optional[str] = None
    lot_no: Optional[str] = None
    dose: Optional[str] = None
    log_time: Optional[str] = None
    next_due_date: Optional[date] = None
    note: Optional[str] = None


class VaccineSchedule(BaseModel):
    vaccine_name: str
    interval_days: int
    note: Optional[str] = None


class AdminLogin(BaseModel):
    username: str
    password: str


class AdminLoginResponse(BaseModel):
    token: str
    username: str


class ChangePassword(BaseModel):
    current_password: str
    new_password: str


class NewAdminUser(BaseModel):
    username: str
    password: str


class ChatTurn(BaseModel):
    role: str  # "user" | "model"
    text: str


class Question(BaseModel):
    text: str
    # ประวัติแชทล่าสุด (frontend ส่งมาแค่ไม่กี่เทิร์นเพื่อประหยัด token)
    history: Optional[list[ChatTurn]] = None


class Answer(BaseModel):
    answer: str


# ---------- แหล่งข้อมูลเซนเซอร์ ----------
# ค่าล่าสุดที่ Node-RED ส่งเข้ามาทาง /ingest ถูกเก็บใน Supabase
# ใช้ค่านี้เป็น fallback ตอนที่ยังไม่มีข้อมูลใน DB เลย
_FALLBACK = Weather(temperature=31.2, humidity=68, windspeed=2.4, rainfall=0.0, light=15000)

BANGKOK = timezone(timedelta(hours=7))


def _parse_dt(iso: str) -> datetime:
    """แปลง ISO timestamp จาก Supabase เป็น datetime ที่มี tzinfo เสมอ
    ถ้าค่าที่ได้ไม่มี timezone (naive) ให้ถือว่าเป็น UTC — กัน .astimezone() ไปอิงเวลาเครื่อง server
    """
    dt = datetime.fromisoformat(iso)
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


def read_sensor() -> Weather:
    res = (
        supabase.table("weather_readings")
        .select("*")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not res.data:
        return _FALLBACK
    r = res.data[0]
    return Weather(
        temperature=r["temperature"],
        humidity=r["humidity"],
        windspeed=r["windspeed"],
        rainfall=r["rainfall"],
        light=r["light"],
    )


# ---------- Endpoints ----------
@app.get("/health")
def health():
    """สถานะระบบ — ใช้โดย monitoring ภายนอก และ frontend (ตัวชี้ CONNECTED/NO SIGNAL)
    ไม่เรียก LLM จริงเพื่อไม่ให้เปลืองโควตา แค่บอกว่าตั้งค่าคีย์ไว้หรือยัง
    """
    db_ok = True
    try:
        supabase.table("weather_readings").select("id").limit(1).execute()
    except Exception as e:
        print(f"[warn] health: DB error: {e}")
        db_ok = False
    return {
        "status": "ok" if db_ok else "degraded",
        "db": db_ok,
        "llm_configured": _llm is not None,
    }


@app.post("/admin/login", response_model=AdminLoginResponse)
def admin_login(body: AdminLogin):
    if not _verify_admin_password(body.username, body.password):
        raise HTTPException(status_code=401, detail="ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง")
    token = secrets.token_urlsafe(32)
    _ADMIN_TOKENS[token] = body.username
    return AdminLoginResponse(token=token, username=body.username)


@app.post("/admin/logout")
def admin_logout(x_admin_token: str = Header(...)):
    _ADMIN_TOKENS.pop(x_admin_token, None)
    return {"ok": True}


@app.get("/admin/whoami")
def admin_whoami(x_admin_token: str = Header(...)):
    username = _ADMIN_TOKENS.get(x_admin_token)
    return {"logged_in": username is not None, "username": username}


@app.post("/admin/change-password")
def admin_change_password(body: ChangePassword, x_admin_token: str = Header(...)):
    username = _ADMIN_TOKENS.get(x_admin_token)
    if not username:
        raise HTTPException(status_code=401, detail="กรุณาเข้าสู่ระบบก่อน")
    if not _verify_admin_password(username, body.current_password):
        raise HTTPException(status_code=401, detail="รหัสผ่านเดิมไม่ถูกต้อง")
    salt = secrets.token_hex(16)
    supabase.table("admin_users").update({
        "password_hash": _hash_password(body.new_password, salt),
        "password_salt": salt,
    }).eq("username", username).execute()
    return {"ok": True}


@app.get("/admin/users")
def list_admin_users():
    """รายชื่อผู้ใช้ admin ทั้งหมด (ไม่ส่ง password กลับไปเด็ดขาด)"""
    res = supabase.table("admin_users").select("id,username,created_at").order("username").execute()
    return {"rows": res.data or []}


@app.post("/admin/users")
def create_admin_user(body: NewAdminUser):
    username = body.username.strip()
    if not username or not body.password:
        raise HTTPException(status_code=400, detail="กรุณาระบุชื่อผู้ใช้และรหัสผ่าน")
    existing = supabase.table("admin_users").select("id").eq("username", username).execute().data
    if existing:
        raise HTTPException(status_code=400, detail="มีชื่อผู้ใช้นี้อยู่แล้ว")
    _create_admin_user(username, body.password)
    return {"ok": True}


@app.delete("/admin/users/{username}")
def delete_admin_user(username: str, x_admin_token: str = Header(...)):
    me = _ADMIN_TOKENS.get(x_admin_token)
    if username == me:
        raise HTTPException(status_code=400, detail="ลบบัญชีตัวเองไม่ได้ ให้ผู้ใช้อื่นลบแทน")
    total = supabase.table("admin_users").select("id", count="exact").execute().count or 0
    if total <= 1:
        raise HTTPException(status_code=400, detail="ต้องมีผู้ใช้ admin อย่างน้อย 1 คนเสมอ")
    supabase.table("admin_users").delete().eq("username", username).execute()
    # เพิกถอน token ของผู้ใช้ที่ถูกลบทั้งหมด กันใช้ session เดิมต่อได้
    for tok, uname in list(_ADMIN_TOKENS.items()):
        if uname == username:
            _ADMIN_TOKENS.pop(tok, None)
    return {"ok": True}


@app.post("/ingest", response_model=Weather, dependencies=[Depends(verify_ingest_token)])
def ingest(w: Weather):
    """Node-RED เรียก endpoint นี้ทุกครั้งที่อ่านค่าเซนเซอร์ใหม่ได้"""
    supabase.table("weather_readings").insert(w.model_dump()).execute()
    return w


@app.post("/ingest-prediction", response_model=Prediction, dependencies=[Depends(verify_ingest_token)])
def ingest_prediction(p: Prediction):
    """Node-RED เรียก endpoint นี้ทุกครั้งที่โมเดล LSTM ทำนายค่าใหม่ (topic lstm/prediction)"""
    data = p.model_dump(mode="json")
    supabase.table("weather_predictions").insert(data).execute()
    return p


@app.get("/readings-log")
def readings_log(page: int = 0, page_size: int = 100, hours: Optional[int] = None):
    """ประวัติค่าเซนเซอร์ดิบจาก weather_readings แบ่งหน้าฝั่ง server (โหมด 'ข้อมูลดิบ')
    page: หน้าที่ต้องการ (เริ่มที่ 0), page_size: จำนวนต่อหน้า (สูงสุด 100)
    hours: ถ้าระบุ จะกรองเฉพาะย้อนหลัง N ชั่วโมง (ไม่ระบุ = ทั้งหมด)
    """
    page = max(0, page)
    page_size = max(1, min(100, page_size))

    query = supabase.table("weather_readings").select("*", count="exact")
    if hours is not None:
        since = (datetime.now(timezone.utc) - timedelta(hours=max(1, min(168, hours)))).isoformat()
        query = query.gte("created_at", since)

    start = page * page_size
    end = start + page_size - 1
    result = query.order("created_at", desc=True).range(start, end).execute()
    total = result.count or 0

    rows = [
        {
            "time": _parse_dt(r["created_at"]).astimezone(BANGKOK).strftime("%d/%m/%Y %H:%M:%S"),
            "temperature": r["temperature"],
            "humidity": r["humidity"],
            "windspeed": r["windspeed"],
            "rainfall": r["rainfall"],
            "light": r["light"],
        }
        for r in (result.data or [])
    ]
    return {"rows": rows, "total": total, "page": page, "page_size": page_size}


@app.get("/predictions-log")
def predictions_log(page: int = 0, page_size: int = 100, hours: Optional[int] = None):
    """ประวัติผลทำนายทั้งหมดใน DB เทียบกับค่าจริงที่ใกล้เคียงที่สุด แบ่งหน้าฝั่ง server
    page: หน้าที่ต้องการ (เริ่มที่ 0), page_size: จำนวนต่อหน้า (สูงสุด 100)
    hours: ถ้าระบุ จะกรองเฉพาะย้อนหลัง N ชั่วโมง (ไม่ระบุ = ทั้งหมด)
    """
    page = max(0, page)
    page_size = max(1, min(100, page_size))

    query = supabase.table("weather_predictions").select("*", count="exact")
    if hours is not None:
        since = (datetime.now(timezone.utc) - timedelta(hours=max(1, min(168, hours)))).isoformat()
        query = query.gte("created_at", since)

    start = page * page_size
    end = start + page_size - 1
    result = query.order("created_at", desc=True).range(start, end).execute()
    preds = result.data
    total = result.count or 0

    actuals = []
    if preds:
        times = [p["created_at"] for p in preds] + [
            p["predicted_for"] for p in preds if p.get("predicted_for")
        ]
        lo = min(_parse_dt(t) for t in times) - timedelta(hours=1)
        hi = max(_parse_dt(t) for t in times) + timedelta(hours=1)
        actuals = (
            supabase.table("weather_readings")
            .select("*")
            .gte("created_at", lo.isoformat())
            .lte("created_at", hi.isoformat())
            .execute()
        ).data

    def closest_actual(target_iso: Optional[str]):
        if not target_iso or not actuals:
            return None
        target = _parse_dt(target_iso)
        return min(
            actuals,
            key=lambda a: abs(_parse_dt(a["created_at"]) - target),
        )


    def fmt(iso, with_date=False):
        if not iso:
            return None
        dt = _parse_dt(iso).astimezone(BANGKOK)
        return dt.strftime("%d/%m/%Y %H:%M:%S") if with_date else dt.strftime("%H:%M:%S")

    rows = []
    for p in preds:
        actual = closest_actual(p.get("predicted_for") or p["created_at"])
        rows.append({
            "predicted_at": fmt(p["created_at"], with_date=True),
            "predicted_for": fmt(p.get("predicted_for")),
            "temperature_pred": p["temperature_pred"],
            "humidity_pred": p["humidity_pred"],
            "windspeed_pred": p["windspeed_pred"],
            "rainfall_pred": p["rainfall_pred"],
            "light_pred": p["light_pred"],
            "temperature_actual": actual["temperature"] if actual else None,
            "humidity_actual": actual["humidity"] if actual else None,
            "windspeed_actual": actual["windspeed"] if actual else None,
            "rainfall_actual": actual["rainfall"] if actual else None,
            "light_actual": actual["light"] if actual else None,
        })
    return {"rows": rows, "total": total, "page": page, "page_size": page_size}


@app.get("/weather")
def weather():
    """ค่าปัจจุบัน + เวลาที่บันทึกข้อมูลล่าสุด (ถึงระดับวินาที, เวลาไทย)"""
    res = (
        supabase.table("weather_readings")
        .select("*")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not res.data:
        w = _FALLBACK
        return {**w.model_dump(), "reading_time": None}
    r = res.data[0]
    reading_time = _parse_dt(r["created_at"]).astimezone(BANGKOK).strftime(
        "%d/%m/%Y %H:%M:%S"
    )
    return {
        "temperature": r["temperature"],
        "humidity": r["humidity"],
        "windspeed": r["windspeed"],
        "rainfall": r["rainfall"],
        "light": r["light"],
        "reading_time": reading_time,
    }


@app.get("/history")
def history():
    since = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    res = (
        supabase.table("weather_readings")
        .select("*")
        .gte("created_at", since)
        .order("created_at", desc=False)
        .execute()
    )
    rows = res.data
    return [
        {
            "time": _parse_dt(r["created_at"]).astimezone(BANGKOK).strftime("%H:%M"),
            "temperature": r["temperature"],
            "humidity": r["humidity"],
            "windspeed": r["windspeed"],
            "rainfall": r["rainfall"],
            "light": r["light"],
        }
        for r in rows
    ]


@app.get("/stats")
def stats(days: int = 7):
    """สรุปสถิติย้อนหลัง N วัน (เฉลี่ย/ต่ำสุด/สูงสุด) — ใช้โดยหน้าเว็บและ AI ตอบคำถามเชิงประวัติ
    คำนวณที่ฝั่ง Postgres ผ่าน RPC function `weather_stats` (ดู schema.sql)
    """
    days = max(1, min(90, days))
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    res = supabase.rpc("weather_stats", {"since": since}).execute()
    row = (res.data or [{}])[0]
    return {
        "days": days,
        "reading_count": row.get("reading_count") or 0,
        "temperature": {
            "avg": row.get("temperature_avg"),
            "min": row.get("temperature_min"),
            "max": row.get("temperature_max"),
        },
        "humidity": {
            "avg": row.get("humidity_avg"),
            "min": row.get("humidity_min"),
            "max": row.get("humidity_max"),
        },
        "windspeed": {
            "avg": row.get("windspeed_avg"),
            "max": row.get("windspeed_max"),
        },
        "rainfall": {
            "sum": row.get("rainfall_sum"),
            "rainy_readings": row.get("rainy_readings") or 0,
        },
        "light": {
            "avg": row.get("light_avg"),
        },
    }


@app.post("/pig-health", response_model=PigHealth, dependencies=[Depends(verify_admin_token)])
def save_pig_health(p: PigHealth):
    """บันทึกจำนวนหมูป่วยรายวัน (กรอกมือจากหน้าเว็บ ไม่ใช่จากเซนเซอร์)"""
    data = p.model_dump(mode="json")
    supabase.table("pig_health_log").insert(data).execute()
    return p


def _lookup_interval_days(vaccine_name: Optional[str]) -> Optional[int]:
    """หาว่าวัคซีนชื่อนี้มีกำหนดรอบฉีดซ้ำตั้งไว้ไหม (จับคู่แบบ substring ทั้งสองทาง กันสะกด/คำต่อท้ายไม่ตรงเป๊ะ)"""
    if not vaccine_name:
        return None
    try:
        rules = supabase.table("vaccine_schedule").select("*").execute().data or []
    except Exception:
        return None
    vn = vaccine_name.strip()
    if not vn:
        return None
    for r in rules:
        rn = (r.get("vaccine_name") or "").strip()
        if rn and (rn in vn or vn in rn):
            return r.get("interval_days")
    return None


@app.post("/vaccine-schedule", response_model=VaccineSchedule, dependencies=[Depends(verify_admin_token)])
def save_vaccine_schedule(s: VaccineSchedule):
    """ตั้ง/แก้กำหนดรอบฉีดซ้ำของวัคซีนชื่อหนึ่ง (1 ชื่อ = 1 กำหนด, ตั้งซ้ำชื่อเดิมจะทับของเก่า)"""
    data = s.model_dump()
    supabase.table("vaccine_schedule").upsert(data, on_conflict="vaccine_name").execute()
    return s


@app.get("/vaccine-schedule")
def list_vaccine_schedule():
    """รายการกำหนดรอบฉีดซ้ำทั้งหมดที่ตั้งไว้"""
    res = supabase.table("vaccine_schedule").select("*").order("vaccine_name").execute()
    return {"rows": res.data or []}


@app.post("/vaccine-log", dependencies=[Depends(verify_admin_token)])
def save_vaccine_log(v: VaccineLog):
    """บันทึกการฉีดวัคซีน/ยาให้หมู (กรอกมือจากหน้าเว็บ หรือสั่งด้วยเสียงผ่าน /ask)
    ถ้าไม่ได้ระบุ next_due_date เอง และวัคซีนนี้มีกำหนดรอบฉีดซ้ำตั้งไว้ -> คำนวณให้อัตโนมัติ
    """
    data = v.model_dump(mode="json")
    if not data.get("next_due_date"):
        interval_days = _lookup_interval_days(data.get("vaccine_name"))
        if interval_days:
            next_due = date.fromisoformat(data["log_date"]) + timedelta(days=interval_days)
            data["next_due_date"] = next_due.isoformat()
    supabase.table("vaccine_log").insert(data).execute()
    return data


@app.get("/vaccine-history")
def vaccine_log_log(page: int = 0, page_size: int = 100):
    """ประวัติการฉีดวัคซีน/ยาทั้งหมด แบ่งหน้าฝั่ง server"""
    page = max(0, page)
    page_size = max(1, min(100, page_size))
    start = page * page_size
    end = start + page_size - 1

    result = (
        supabase.table("vaccine_log")
        .select("*", count="exact")
        .order("log_date", desc=True)
        .range(start, end)
        .execute()
    )
    return {
        "rows": result.data or [],
        "total": result.count or 0,
        "page": page,
        "page_size": page_size,
    }


@app.get("/export/vaccine-log.png")
def export_vaccine_log_png(limit: int = 25):
    """ออกรายงานประวัติการฉีดวัคซีนเป็น "รูปภาพ" ภาษาไทย

    LINE ไม่รองรับการแนบไฟล์ (PDF/เอกสาร) — รองรับแค่รูป/วิดีโอ/เสียง
    เลยเรนเดอร์รายงานเป็น PNG เพื่อส่งเข้า LINE ให้เห็นเนื้อหาในแชทได้เลย
    """
    from PIL import Image, ImageDraw, ImageFont

    limit = max(1, min(60, limit))
    rows = (
        supabase.table("vaccine_log")
        .select("*")
        .order("log_date", desc=True)
        .limit(limit)
        .execute()
        .data
        or []
    )

    cols = [
        ("วันที่", 130), ("วัคซีน/ยา", 210), ("โรงเรือน", 140),
        ("คอก", 110), ("จำนวน", 100), ("ผู้ฉีด", 170), ("นัดถัดไป", 140),
    ]
    W = sum(w for _, w in cols) + 60
    ROW_H, HEAD_Y = 44, 150
    H = HEAD_Y + ROW_H * (len(rows) + 1) + 60

    img = Image.new("RGB", (W, H), "#ffffff")
    d = ImageDraw.Draw(img)
    f_title = ImageFont.truetype(_FONT_BOLD, 34)
    f_sub = ImageFont.truetype(_FONT_REGULAR, 20)
    f_head = ImageFont.truetype(_FONT_BOLD, 20)
    f_cell = ImageFont.truetype(_FONT_REGULAR, 19)

    d.rectangle([0, 0, W, 100], fill="#1d4ed8")
    d.text((30, 28), "รายงานประวัติการฉีดวัคซีน · ฟาร์มมี่", font=f_title, fill="#ffffff")
    d.text((30, 112), f"ออกรายงานเมื่อ {datetime.now(BANGKOK).strftime('%d/%m/%Y %H:%M')} · {len(rows)} รายการล่าสุด",
           font=f_sub, fill="#475569")

    x = 30
    d.rectangle([30, HEAD_Y, W - 30, HEAD_Y + ROW_H], fill="#e0e7ff")
    for name, w in cols:
        d.text((x + 10, HEAD_Y + 12), name, font=f_head, fill="#1e293b")
        x += w

    y = HEAD_Y + ROW_H
    for i, r in enumerate(rows):
        if i % 2 == 0:
            d.rectangle([30, y, W - 30, y + ROW_H], fill="#f8fafc")
        vals = [
            str(r.get("log_date") or "-"),
            str(r.get("vaccine_name") or "-"),
            str(r.get("barn_no") or "-"),
            str(r.get("pen_no") or "-"),
            str(r.get("pig_count") if r.get("pig_count") is not None else "-"),
            str(r.get("injector") or "-"),
            str(r.get("next_due_date") or "-"),
        ]
        x = 30
        for (_, w), v in zip(cols, vals):
            if len(v) > 18:
                v = v[:17] + "…"
            d.text((x + 10, y + 12), v, font=f_cell, fill="#0f172a")
            x += w
        y += ROW_H

    d.rectangle([30, HEAD_Y, W - 30, y], outline="#cbd5e1", width=1)

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return Response(content=buf.getvalue(), media_type="image/png")


@app.get("/export/vaccine-log.pdf")
def export_vaccine_log_pdf():
    """ออกรายงานประวัติการฉีดวัคซีนทั้งหมดเป็น PDF ภาษาไทย"""
    rows = (
        supabase.table("vaccine_log")
        .select("*")
        .order("log_date", desc=True)
        .execute()
        .data
        or []
    )

    pdf = _new_thai_pdf()
    pdf.set_font("Thai", "B", 16)
    pdf.cell(0, 12, "รายงานประวัติการฉีดวัคซีน - ฟาร์มมี่", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Thai", size=10)
    pdf.cell(0, 8, f"ออกรายงานเมื่อ {datetime.now(BANGKOK).strftime('%d/%m/%Y %H:%M')}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    col_widths = [22, 30, 22, 22, 22, 25, 30, 30]
    headers = ["วันที่ฉีด", "วัคซีน/ยา", "โรงเรือน", "คอก", "จำนวน", "ผู้ฉีด", "นัดครั้งถัดไป", "บันทึกเพิ่มเติม"]

    pdf.set_font("Thai", "B", 9)
    for w, h in zip(col_widths, headers):
        pdf.cell(w, 8, h, border=1, align="C")
    pdf.ln()

    pdf.set_font("Thai", size=9)
    for r in rows:
        values = [
            r.get("log_date") or "-",
            r.get("vaccine_name") or "-",
            r.get("barn_no") or "-",
            r.get("pen_no") or "-",
            str(r.get("pig_count") or "-"),
            r.get("injector") or "-",
            r.get("next_due_date") or "-",
            r.get("note") or "-",
        ]
        for w, v in zip(col_widths, values):
            pdf.cell(w, 7, v[:18], border=1)
        pdf.ln()

    pdf_bytes = bytes(pdf.output())
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=vaccine-log.pdf"},
    )


# ---------- ลิงก์สาธารณะสำหรับปุ่มริชเมนู LINE ----------
# ปุ่มริชเมนูฝังลิงก์ตายตัว จึงใช้ token หมดอายุไม่ได้ ต้องยืนยันด้วยคีย์ลับใน path แทน


def _check_report_key(key: str) -> None:
    """ตรวจคีย์ลับ ถ้าไม่ตรงให้ตอบ 404 (ไม่ใช่ 403) จะได้ไม่บอกใบ้ว่ามี endpoint นี้อยู่จริง"""
    if not PUBLIC_REPORT_KEY or not secrets.compare_digest(key, PUBLIC_REPORT_KEY):
        raise HTTPException(status_code=404, detail="Not Found")


@app.get("/r/{key}/vaccine.pdf")
def public_vaccine_pdf(key: str):
    """รายงานวัคซีนเป็น PDF — เปิดจากมือถือได้เลย ไม่ต้องล็อกอิน"""
    _check_report_key(key)
    res = export_vaccine_log_pdf()
    # เปิดอ่านในเบราว์เซอร์เลย ดีกว่าบังคับดาวน์โหลดตอนกดจากในแอป LINE
    res.headers["Content-Disposition"] = "inline; filename=vaccine-log.pdf"
    return res


@app.get("/r/{key}/vaccine.png")
def public_vaccine_png(key: str, limit: int = 25):
    """รายงานวัคซีนเป็นรูป — โหลดไวกว่า PDF บนมือถือ"""
    _check_report_key(key)
    return export_vaccine_log_png(limit=limit)


@app.get("/r/{key}/summary")
def public_farm_summary(key: str):
    """สรุปฟาร์มวันนี้ เป็นหน้าเว็บอ่านง่ายบนมือถือ"""
    _check_report_key(key)

    today = datetime.now(BANGKOK).date().isoformat()

    def _safe(fn, default):
        """ดึงข้อมูลแต่ละส่วนแยกกัน ส่วนไหนล่มก็ยังแสดงส่วนที่เหลือได้"""
        try:
            return fn()
        except Exception:
            return default

    weather_now = _safe(lambda: weather(), {})
    sick_rows = _safe(
        lambda: supabase.table("pig_health_log")
        .select("*")
        .eq("log_date", today)
        .execute()
        .data
        or [],
        [],
    )
    due_rows = _safe(lambda: _vaccine_due_rows(7), [])
    vaccine_rows = _safe(
        lambda: supabase.table("vaccine_log")
        .select("*")
        .order("log_date", desc=True)
        .limit(5)
        .execute()
        .data
        or [],
        [],
    )

    sick_total = sum(int(r.get("sick_count") or 0) for r in sick_rows)

    def esc(v) -> str:
        return (
            str(v)
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
        )

    def rows_html(rows: list[dict], cols: list[tuple[str, str]]) -> str:
        if not rows:
            return '<p class="empty">ยังไม่มีข้อมูล</p>'
        head = "".join(f"<th>{esc(label)}</th>" for _, label in cols)
        body = "".join(
            "<tr>" + "".join(f"<td>{esc(r.get(k) or '-')}</td>" for k, _ in cols) + "</tr>"
            for r in rows
        )
        return f"<table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>"

    html = f"""<!doctype html>
<html lang="th"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>สรุปฟาร์มวันนี้ · ฟาร์มมี่</title>
<style>
  :root {{ color-scheme: light dark; }}
  * {{ box-sizing: border-box; }}
  body {{ margin:0; padding:22px 18px 60px; background:#f7f8f7; color:#16232b;
         font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans Thai",sans-serif;
         line-height:1.6; }}
  h1 {{ font-size:23px; margin:0 0 4px; }}
  .date {{ color:#68757d; font-size:14px; margin-bottom:22px; }}
  .cards {{ display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:12px; margin-bottom:26px; }}
  .card {{ background:#fff; border-radius:14px; padding:15px 16px; box-shadow:0 1px 3px rgba(0,0,0,.07); }}
  .card .label {{ font-size:13px; color:#68757d; }}
  .card .value {{ font-size:29px; font-weight:600; margin-top:3px; }}
  h2 {{ font-size:16px; margin:26px 0 10px; }}
  table {{ width:100%; border-collapse:collapse; background:#fff; border-radius:12px;
           overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.07); font-size:14px; }}
  th, td {{ padding:10px 12px; text-align:left; border-bottom:1px solid #eef1f0; }}
  th {{ background:#f0f4f2; font-weight:600; font-size:13px; color:#4a5a63; }}
  tr:last-child td {{ border-bottom:none; }}
  .empty {{ color:#8c979d; font-size:14px; margin:0; }}
  .links {{ margin-top:30px; display:flex; flex-direction:column; gap:10px; }}
  .links a {{ display:block; background:#16945c; color:#fff; text-decoration:none;
              padding:14px; border-radius:12px; text-align:center; font-weight:600; }}
  @media (prefers-color-scheme: dark) {{
    body {{ background:#0f1512; color:#e8ecea; }}
    .card, table {{ background:#182120; box-shadow:none; }}
    th {{ background:#1f2a27; color:#9fb0a8; }}
    th, td {{ border-color:#26312e; }}
  }}
</style>
</head><body>
  <h1>สรุปฟาร์มวันนี้</h1>
  <div class="date">ฟาร์มมี่ · {esc(datetime.now(BANGKOK).strftime('%d/%m/%Y %H:%M'))}</div>

  <div class="cards">
    <div class="card"><div class="label">สุกรป่วยวันนี้</div><div class="value">{sick_total}</div></div>
    <div class="card"><div class="label">ถึงคิวฉีดใน 7 วัน</div><div class="value">{len(due_rows)}</div></div>
    <div class="card"><div class="label">อุณหภูมิ</div><div class="value">{esc(weather_now.get('temperature', '-'))}°C</div></div>
    <div class="card"><div class="label">ความชื้น</div><div class="value">{esc(weather_now.get('humidity', '-'))}%</div></div>
  </div>

  <h2>บันทึกสุกรป่วยวันนี้</h2>
  {rows_html(sick_rows, [("log_date", "วันที่"), ("sick_count", "ป่วย"), ("total_count", "ทั้งหมด"), ("note", "หมายเหตุ")])}

  <h2>วัคซีนที่ถึงกำหนดใน 7 วัน</h2>
  {rows_html(due_rows, [("next_due_date", "วันนัด"), ("vaccine_name", "วัคซีน"), ("barn_no", "โรงเรือน")])}

  <h2>ฉีดวัคซีนล่าสุด</h2>
  {rows_html(vaccine_rows, [("log_date", "วันที่"), ("vaccine_name", "วัคซีน"), ("barn_no", "โรงเรือน"), ("pig_count", "จำนวน")])}

  <div class="links">
    <a href="/r/{esc(key)}/vaccine.pdf">เปิดรายงานวัคซีน (PDF)</a>
  </div>
</body></html>"""

    return Response(content=html, media_type="text/html; charset=utf-8")


def _vaccine_due_rows(days: int = 7) -> list[dict]:
    days = max(0, min(90, days))  # 0 = ถึงกำหนดวันนี้/เลยกำหนดแล้วเท่านั้น
    today = datetime.now(BANGKOK).date()
    until = (today + timedelta(days=days)).isoformat()
    res = (
        supabase.table("vaccine_log")
        .select("*")
        .not_.is_("next_due_date", "null")
        .lte("next_due_date", until)
        .order("next_due_date", desc=False)
        .execute()
    )
    return res.data or []


def _build_vaccine_report_messages() -> list[dict]:
    """ชุดข้อความรายงานวัคซีน (รูป + ลิงก์ PDF) ใช้ร่วมกันทั้งตอน broadcast และตอบ webhook"""
    img_url = f"{PUBLIC_BASE_URL}/export/vaccine-log.png?t={_issue_download_token()}"
    pdf_url = f"{PUBLIC_BASE_URL}/export/vaccine-log.pdf?t={_issue_download_token()}"
    return [
        {"type": "image", "originalContentUrl": img_url, "previewImageUrl": img_url},
        {
            "type": "text",
            "text": (
                "รายงานประวัติการฉีดวัคซีน · ฟาร์มมี่\n"
                f"ไฟล์ PDF ฉบับเต็ม (ลิงก์หมดอายุใน {DOWNLOAD_TOKEN_TTL_MIN} นาที):\n{pdf_url}"
            ),
        },
    ]


@app.post("/line/webhook")
async def line_webhook(request: Request):
    """รับ event จาก LINE (คนพิมพ์ข้อความ / กดปุ่มริชเมนู) แล้วตอบกลับให้

    ต้องตรวจลายเซ็น X-Line-Signature ทุกครั้ง กันคนอื่นยิง endpoint นี้มั่ว ๆ
    """
    body = await request.body()
    signature = request.headers.get("x-line-signature", "")
    if LINE_CHANNEL_SECRET:
        expected = base64.b64encode(
            hmac.new(LINE_CHANNEL_SECRET.encode(), body, hashlib.sha256).digest()
        ).decode()
        if not hmac.compare_digest(expected, signature):
            raise HTTPException(status_code=403, detail="invalid signature")

    try:
        events = json.loads(body or b"{}").get("events", [])
    except Exception:
        events = []

    for ev in events:
        reply_token = ev.get("replyToken")
        if not reply_token:
            continue

        # ข้อความที่พิมพ์มา หรือค่า data จากปุ่มริชเมนู (postback)
        if ev.get("type") == "postback":
            text = (ev.get("postback") or {}).get("data", "")
        elif ev.get("type") == "message" and (ev.get("message") or {}).get("type") == "text":
            text = (ev.get("message") or {}).get("text", "")
        else:
            continue

        t = text.strip()
        try:
            if "รายงาน" in t or "วัคซีน" in t or t == "vaccine_report":
                _line_reply(reply_token, _build_vaccine_report_messages())
            elif "สรุป" in t or "ฟาร์ม" in t or t == "farm_summary":
                _line_reply(reply_token, [{"type": "text", "text": _build_farm_summary_for_line()}])
            elif "ป่วย" in t or t == "pig_sick":
                _line_reply(reply_token, [{"type": "text", "text": _rule_based_answer("หมูป่วยกี่ตัว")}])
            else:
                # คำถามอื่น ๆ ส่งเข้า AI ตัวเดียวกับบนเว็บ
                answer = ask(Question(text=t)).answer
                _line_reply(reply_token, [{"type": "text", "text": answer}])
        except Exception as e:
            print(f"[warn] ตอบ LINE webhook ไม่สำเร็จ: {e}")
            _line_reply(reply_token, [{"type": "text", "text": "ขออภัยครับ ระบบขัดข้องชั่วคราว ลองใหม่อีกครั้งนะครับ"}])

    return {"ok": True}


@app.post("/line/send-vaccine-report")
def line_send_vaccine_report():
    """ปุ่มบนเว็บ: ส่งรายงานวัคซีน (รูป + ลิงก์ PDF) เข้า LINE ทันที"""
    msg = _send_line_vaccine_report()
    ok = "แล้วครับ" in msg
    return {"ok": ok, "message": msg}


@app.get("/vaccine-due")
def vaccine_due(days: int = 7):
    """รายการวัคซีนที่ใกล้ครบกำหนดฉีดซ้ำ (next_due_date อยู่ในอีก N วันข้างหน้า หรือเลยกำหนดไปแล้ว)
    ใช้แสดงในการ์ดแจ้งเตือน/ภาพรวมฟาร์ม ไม่ต้องดึงประวัติทั้งหมดมากรองฝั่ง frontend
    """
    rows = _vaccine_due_rows(days)
    return {
        "rows": rows,
        "total": len(rows),
        "today": datetime.now(BANGKOK).date().isoformat(),
    }


@app.get("/pig-health-log")
def pig_health_log(page: int = 0, page_size: int = 100):
    """ประวัติจำนวนหมูป่วยรายวันทั้งหมด แบ่งหน้าฝั่ง server"""
    page = max(0, page)
    page_size = max(1, min(100, page_size))
    start = page * page_size
    end = start + page_size - 1

    result = (
        supabase.table("pig_health_log")
        .select("*", count="exact")
        .order("log_date", desc=True)
        .range(start, end)
        .execute()
    )
    return {
        "rows": result.data or [],
        "total": result.count or 0,
        "page": page,
        "page_size": page_size,
    }


@app.get("/predict")
def predict():
    """
    ตารางทำนาย: แถวปัจจุบัน + ทำนายล่วงหน้าเป็นรายชั่วโมง

    ลำดับความสำคัญของข้อมูล:
    1) ถ้ามีผลจากโมเดล LSTM จริงใน weather_predictions (Node-RED/Jetson Nano ส่งเข้ามาทาง
       /ingest-prediction) และยังไม่เก่าเกินไป -> ใช้ค่านั้น
    2) ถ้ายังไม่มี (เช่น ฮาร์ดแวร์ที่สำนักงานยังไม่ได้เชื่อม/ปิดอยู่) -> fallback เป็นการประมาณ
       เชิงเส้นจากค่าปัจจุบัน พร้อมติดธง is_estimate=True ให้ frontend รู้ว่าเป็นค่าประมาณ ไม่ใช่ผล LSTM จริง
    """
    now = read_sensor()
    base_hour = datetime.now()
    rows = [{
        "hour": base_hour.strftime("%H:00"),
        "is_now": True,
        "is_estimate": False,
        **now.model_dump(),
    }]

    since = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
    res = (
        supabase.table("weather_predictions")
        .select("*")
        .gte("predicted_for", since)
        .order("predicted_for", desc=False)
        .limit(5)
        .execute()
    )
    real = res.data or []

    if real:
        for p in real:
            t = (
                _parse_dt(p["predicted_for"]).astimezone(BANGKOK)
                if p.get("predicted_for") else None
            )
            rows.append({
                "hour": t.strftime("%H:00") if t else "--:--",
                "is_now": False,
                "is_estimate": False,
                "temperature": p.get("temperature_pred"),
                "humidity": p.get("humidity_pred"),
                "windspeed": p.get("windspeed_pred"),
                "rainfall": p.get("rainfall_pred"),
                "light": p.get("light_pred"),
            })
    else:
        # fallback: ยังไม่มีผลทำนายจริงเข้ามา (เช่น Node-RED/Jetson ยังไม่ได้เชื่อม)
        for i in range(1, 6):
            t = base_hour + timedelta(hours=i)
            rows.append({
                "hour": t.strftime("%H:00"),
                "is_now": False,
                "is_estimate": True,
                "temperature": round((now.temperature or 30) - i * 0.4, 1),
                "humidity": round((now.humidity or 60) + i * 1.5, 1),
                "windspeed": round((now.windspeed or 2) + i * 0.1, 1),
                "rainfall": round(max(0, (now.rainfall or 0) + (i - 3) * 0.2), 1),
                "light": max(0, int((now.light or 10000) - i * 1500)),
            })
    return rows


SYSTEM_PROMPT = (
    "คุณคือผู้ช่วย AI ของฟาร์มสระบุรี ดูแลทั้งสถานีตรวจอากาศอัจฉริยะ (Weather Station AI) "
    "และข้อมูลสุขภาพหมูในฟาร์ม ช่วยเกษตรกร/ผู้ดูแลฟาร์มเข้าใจสภาพอากาศ สุขภาพหมู และให้คำแนะนำเชิงปฏิบัติ\n"
    "แนวทางการตอบ:\n"
    "- ตอบเฉพาะสิ่งที่ถูกถามเท่านั้น ห้ามพูดถึงสภาพอากาศถ้าคำถามไม่ได้เกี่ยวกับสภาพอากาศ\n"
    "  (เช่น ถ้าถามเรื่องสายพันธุ์หมู ให้ตอบเรื่องสายพันธุ์หมูอย่างเดียว ไม่ต้องพ่วงตัวเลขอากาศมาด้วย)\n"
    "- ใช้ตัวเลขจาก CONTEXT เป็นข้อมูลอ้างอิงหลักเฉพาะตอนคำถามเกี่ยวข้องกับตัวเลขนั้นจริง ๆ\n"
    "- ตอบเป็นภาษาไทย สุภาพ กระชับ ลงท้ายด้วย 'ครับ'\n"
    "- อ้างอิงตัวเลขจริงพร้อมหน่วยเมื่อเกี่ยวข้อง\n"
    "- ถ้าถามพยากรณ์/แนวโน้มอากาศ ให้ดูตารางพยากรณ์และประวัติย้อนหลัง แล้วสรุปทิศทาง (สูงขึ้น/ลดลง/ทรงตัว)\n"
    "- ถ้าถามเชิงประวัติ/สถิติอากาศ (เช่น สัปดาห์นี้ร้อนสุดกี่องศา, เดือนนี้ฝนตกกี่ครั้ง) ให้ดูจากสถิติย้อนหลังใน CONTEXT\n"
    "- ถ้าถามเรื่องหมูป่วย/สุขภาพหมู ให้ดูจากบันทึกหมูป่วยรายวันใน CONTEXT สรุปจำนวน แนวโน้ม (เพิ่มขึ้น/ลดลง) และเตือนถ้าตัวเลขสูงผิดปกติ\n"
    "- ถ้าถามเรื่องการฉีดวัคซีน ให้ดูจากบันทึกการฉีดวัคซีนใน CONTEXT บอกวันที่ฉีดล่าสุดและชื่อวัคซีนตามนั้น\n"
    "- ถ้าถามเรื่องสายพันธุ์หมู/ชนิดหมู ให้ดูจาก 'ความรู้อ้างอิง' ใน CONTEXT แล้วตอบตามนั้นตรง ๆ\n"
    "- ถ้าผู้ใช้ขอคำแนะนำ (เช่น การดูแลพืช/หมู ตากผ้า รดน้ำ) ให้แนะนำโดยอิงจากข้อมูลปัจจุบัน/พยากรณ์ ตามความรู้ทั่วไปได้\n"
    "- ห้ามแต่งตัวเลขที่ไม่มีใน CONTEXT ถ้าไม่มีข้อมูลค่านั้นให้บอกตรง ๆ ว่ายังไม่มีข้อมูล\n"
    "- ตอบสั้น 1-4 ประโยค เหมาะกับการอ่านออกเสียง (ไม่ใส่ตาราง/markdown)"
)


def _fmt_weather(w: Weather) -> str:
    return (
        f"อุณหภูมิ {w.temperature}°C, ความชื้น {w.humidity}%, "
        f"ลม {w.windspeed} m/s, ฝน {w.rainfall} mm, แสง {w.light} lux"
    )


# คำที่บ่งบอกว่าผู้ใช้ถามเรื่องพยากรณ์/แนวโน้ม -> ต้องแนบ history+forecast ให้ LLM
_FORECAST_KEYWORDS = ("พยากรณ์", "ทำนาย", "อีก", "ต่อไป", "แนวโน้ม", "จะ", "คาด", "เดี๋ยว", "ชั่วโมง", "ช่วง")

# คำที่บ่งบอกว่าผู้ใช้ถามเชิงประวัติ/สถิติ -> ต้องแนบสรุปสถิติย้อนหลังให้ LLM
# ถ้าระบุช่วงเวลาชัดเจน ใช้จำนวนวันตามนั้น ไม่งั้น default 7 วัน
_STATS_PERIOD_KEYWORDS = {
    "เมื่อวาน": 1, "วันนี้": 1,
    "สัปดาห์": 7, "อาทิตย์": 7,
    "เดือน": 30,
}
_STATS_GENERIC_KEYWORDS = ("ย้อนหลัง", "เฉลี่ย", "สูงสุด", "ต่ำสุด", "สถิติ", "รวม", "กี่วัน", "กี่ครั้ง", "ที่ผ่านมา")


def _needs_forecast(text: str) -> bool:
    return any(k in text for k in _FORECAST_KEYWORDS)


def _needs_stats(text: str) -> Optional[int]:
    """คืนจำนวนวันย้อนหลังที่ควรสรุปสถิติ ถ้าคำถามเข้าข่ายเชิงประวัติ ไม่งั้นคืน None"""
    for k, days in _STATS_PERIOD_KEYWORDS.items():
        if k in text:
            return days
    if any(k in text for k in _STATS_GENERIC_KEYWORDS):
        return 7
    return None


# คำที่บ่งบอกว่าผู้ใช้ถามเรื่องหมู/สุขภาพหมู/วัคซีน -> ต้องแนบบันทึกหมูป่วย+วัคซีนให้ LLM
_PIG_KEYWORDS = ("หมู", "สุกร", "ป่วย", "คอก", "ปศุสัตว์", "วัคซีน", "ฉีดยา")


def _needs_pig(text: str) -> bool:
    return any(k in text for k in _PIG_KEYWORDS)


# ข้อมูลอ้างอิงคงที่ (ไม่เปลี่ยนบ่อย) เรื่องสายพันธุ์หมูที่นิยมเลี้ยงในไทย
# ใส่เป็นข้อความตรง ๆ ในโค้ด ไม่ต้องสร้างตาราง เพราะเป็นความรู้ทั่วไป ไม่ใช่ข้อมูลรายวันที่มีคนกรอกเพิ่ม
_PIG_BREEDS_INFO = (
    "ความรู้อ้างอิง: สายพันธุ์หมูที่นิยมเลี้ยงในไทย แบ่งเป็น 2 ประเภท\n"
    "1. หมูพันธุ์พื้นเมือง: 1.1 พันธุ์ไหหลำ, 1.2 พันธุ์ควาย, 1.3 พันธุ์ราด, 1.4 พันธุ์พวง\n"
    "2. หมูพันธุ์ต่างประเทศ: 2.1 พันธุ์แลนด์เรซ, 2.2 พันธุ์ลาร์จไวต์, 2.3 พันธุ์ดูร็อก, 2.4 พันธุ์ลูกผสม"
)

# คำที่บ่งบอกว่าถามเรื่อง "สายพันธุ์หมู" โดยเฉพาะ -> ข้อมูลนี้ตายตัว ไม่ต้องให้ AI แต่งประโยค
# (กันความเสี่ยงที่โมเดลเล็กจะมั่ว/หลุดประเด็น) ตอบตรงจาก _PIG_BREEDS_INFO เสมอ ไม่ผ่าน Gemini/Ollama เลย
_PIG_BREED_KEYWORDS = ("สายพันธุ์หมู", "พันธุ์หมู", "หมูพันธุ์")


def _needs_pig_breed_info(text: str) -> bool:
    return any(k in text for k in _PIG_BREED_KEYWORDS)


# ---------- คำสั่งด้วยเสียง: บันทึกการฉีดวัคซีน ----------
# แยกกลไกจาก Q&A ปกติ: ตรวจจับ "คำสั่ง" (record intent) แล้วบันทึกลง DB ตรง ๆ
# ทำแบบ deterministic (regex/keyword) ไม่ใช้ LLM ช่วยดึงข้อมูล เพราะการบันทึกข้อมูลต้องแม่นยำ
# 100% (จากที่เจอมาก่อนหน้า โมเดลเล็กอย่าง Ollama ไม่น่าเชื่อถือพอสำหรับงานที่ต้องแม่นยำ)
_VACCINE_RECORD_VERBS = ("บันทึก", "จด")
_VACCINE_WORDS = ("วัคซีน", "ฉีดยา", "ฉีดวัคซีน")


def _is_vaccine_record_command(text: str) -> bool:
    return (
        any(v in text for v in _VACCINE_RECORD_VERBS)
        and any(w in text for w in _VACCINE_WORDS)
    )


# วลี/คำฟุ่มเฟือยที่มักปนอยู่ในประโยคพูด ตัดทิ้งไม่ว่าจะอยู่ตรงไหนของประโยค (ไม่ใช่แค่ต้น/ท้าย)
# เพื่อให้เหลือแต่ "ชื่อโรค/วัคซีน" ล้วน ๆ ไปลงตาราง เช่น "เลือดจาง" ไม่ใช่ "วันนี้บันทึกฉีดวัคซีนโรคเลือดจางของหมู"
_VACCINE_STRIP_PHRASES = (
    "บันทึกว่า", "บันทึกการฉีดวัคซีน", "บันทึกฉีดวัคซีน", "บันทึกวัคซีน",
    "จดว่า", "จดการฉีดวัคซีน", "จดฉีดวัคซีน", "จดวัคซีน",
    "ฉีดวัคซีน", "ฉีดยา", "บันทึก", "จด",
    "ให้กับหมู", "ให้หมู", "ของหมู", "กับหมู", "หมู",
    "เมื่อวาน", "วานนี้", "พรุ่งนี้", "วันนี้",
    "โรค",  # เอาแค่ชื่อโรค ไม่ต้องมีคำว่า "โรค" นำหน้า
)


_INTERVAL_MENTION_RE = re.compile(
    r"(?:อีก|ทุก)\s*\d+\s*(?:วัน|เดือน|สัปดาห์|อาทิตย์)(?:ฉีดอีกที|ต้องฉีดอีก|ฉีดซ้ำ|ฉีดครั้งถัดไป)?"
)


def _extract_vaccine_name(text: str) -> Optional[str]:
    cleaned = _INTERVAL_MENTION_RE.sub(" ", text)  # ตัดวลีเรื่องรอบฉีดซ้ำออกก่อน ไม่ให้ปนชื่อวัคซีน
    for phrase in _VACCINE_STRIP_PHRASES:
        cleaned = cleaned.replace(phrase, " ")
    # ตัดคำเชื่อมหัว-ท้ายแบบ "ทั้งคำ" เท่านั้น
    # (ห้ามใช้ .strip("ที่ให้กับ") เพราะมันตัดทีละ "ตัวอักษร" ทำให้ชื่ออย่าง "ทดสอบระบบ" โดนกินหัวท้ายเหลือ "ดสอบระ")
    cleaned = re.sub(r"\s+", " ", cleaned).strip(" ,")
    cleaned = re.sub(r"^(?:ที่|ให้|กับ|ของ|แก่)+\s*", "", cleaned)
    cleaned = re.sub(r"\s*(?:ที่|ให้|กับ|ของ|แก่)+$", "", cleaned)
    return cleaned.strip(" ,") or None


def _extract_log_date(text: str) -> date:
    today = datetime.now(BANGKOK).date()
    if "เมื่อวาน" in text or "วานนี้" in text:
        return today - timedelta(days=1)
    if "พรุ่งนี้" in text:
        return today + timedelta(days=1)
    return today  # ไม่ระบุวัน = ถือว่าฉีดวันนี้ (กรณีที่พบบ่อยที่สุด)


# จับ "รอบฉีดซ้ำ" ที่พูดแนบมาในประโยคเดียวกันตรง ๆ เช่น "อีก 30 วันฉีดอีกที" / "ทุก 1 เดือน"
# ไม่ต้องไปตั้งในหน้ากำหนดก่อนก็ได้ พูดครั้งแรกแล้วจำเลย (แก้ทีหลังในหน้ากำหนดได้เสมอ)
_INTERVAL_DAY_RE = re.compile(r"(?:อีก|ทุก)\s*(\d+)\s*วัน")
_INTERVAL_MONTH_RE = re.compile(r"(?:อีก|ทุก)\s*(\d+)\s*เดือน")
_INTERVAL_WEEK_RE = re.compile(r"(?:อีก|ทุก)\s*(\d+)\s*(?:สัปดาห์|อาทิตย์)")


def _extract_interval_days(text: str) -> Optional[int]:
    m = _INTERVAL_DAY_RE.search(text)
    if m:
        return int(m.group(1))
    m = _INTERVAL_MONTH_RE.search(text)
    if m:
        return int(m.group(1)) * 30  # ประมาณ 1 เดือน = 30 วัน
    m = _INTERVAL_WEEK_RE.search(text)
    if m:
        return int(m.group(1)) * 7
    return None


def _record_vaccine_from_voice(text: str) -> str:
    """บันทึกการฉีดวัคซีนจากคำสั่งเสียง แล้วคืนข้อความยืนยันให้พูดกลับ

    หากำหนดรอบฉีดซ้ำ 2 ทาง เรียงลำดับ:
    1) พูดระบุมาในประโยคเดียวกันเลย (เช่น "อีก 30 วันฉีดอีกที") -> ใช้ค่านี้ + จำไว้เป็นกำหนด
       ของวัคซีนนี้ในตาราง vaccine_schedule ให้อัตโนมัติ (ครั้งหน้าไม่ต้องพูดซ้ำ)
    2) ถ้าไม่ได้พูดระบุ -> ใช้กำหนดที่เคยตั้ง/จำไว้ก่อนหน้าแทน (ถ้ามี)
    """
    log_date = _extract_log_date(text)
    vaccine_name = _extract_vaccine_name(text)

    spoken_interval = _extract_interval_days(text)
    if spoken_interval and vaccine_name:
        # พูดระบุรอบฉีดซ้ำมาเอง -> จำไว้เป็นกำหนดของวัคซีนนี้ (ทับของเดิมถ้ามี ใช้ค่าล่าสุดที่พูด)
        try:
            supabase.table("vaccine_schedule").upsert(
                {"vaccine_name": vaccine_name, "interval_days": spoken_interval},
                on_conflict="vaccine_name",
            ).execute()
        except Exception as e:
            print(f"[warn] จำกำหนดรอบฉีดซ้ำไม่สำเร็จ: {e}")
        interval_days = spoken_interval
    else:
        interval_days = _lookup_interval_days(vaccine_name)

    next_due = log_date + timedelta(days=interval_days) if interval_days else None
    data = {
        "log_date": log_date.isoformat(),
        "vaccine_name": vaccine_name,
        "next_due_date": next_due.isoformat() if next_due else None,
        "note": text,  # เก็บประโยคดิบที่พูดไว้ด้วย เผื่อต้องตรวจสอบย้อนหลัง
    }
    supabase.table("vaccine_log").insert(data).execute()
    what = vaccine_name or "วัคซีน"
    when = log_date.strftime("%d/%m/%Y")
    msg = f"บันทึกแล้วครับ ฉีด{what} วันที่ {when}"
    if next_due:
        msg += f" นัดฉีดครั้งถัดไปวันที่ {next_due.strftime('%d/%m/%Y')} ครับ"
    return msg


# ---------- คำสั่งด้วยเสียง: ส่งสรุปฟาร์มไป LINE ----------
_LINE_SEND_VERBS = ("ส่ง",)
_LINE_WORDS = ("ไลน์", "line", "LINE")


def _is_line_send_command(text: str) -> bool:
    return any(v in text for v in _LINE_SEND_VERBS) and any(w in text for w in _LINE_WORDS)


def _build_farm_summary_for_line() -> str:
    """สรุปสถานะฟาร์มจากข้อมูลจริง (สภาพอากาศ + หมูป่วยล่าสุด + วัคซีนใกล้ครบกำหนด) เป็นข้อความส่ง LINE"""
    lines = ["สรุปฟาร์มมี่ประจำวันนี้"]

    try:
        w = weather()
        lines.append(
            f"สภาพอากาศ: อุณหภูมิ {w['temperature']}°C ความชื้น {w['humidity']}% "
            f"ลม {w['windspeed']} m/s ฝน {w['rainfall']} mm"
        )
    except Exception:
        pass

    try:
        pig_rows = _recent_pig_health(limit=1)
        if pig_rows:
            p = pig_rows[0]
            extra = f" จากทั้งหมด {p['total_count']} ตัว" if p.get("total_count") is not None else ""
            lines.append(f"หมูป่วยล่าสุด ({p['log_date']}): {p['sick_count']} ตัว{extra}")
    except Exception:
        pass

    try:
        due_rows = _vaccine_due_rows(days=7)
        if due_rows:
            lines.append(f"วัคซีนใกล้ครบกำหนด {len(due_rows)} รายการ:")
            for r in due_rows[:5]:
                where = " ".join(filter(None, [r.get("barn_no"), r.get("pen_no")]))
                lines.append(f"  - {r.get('vaccine_name') or 'วัคซีน'} ({r['next_due_date']}){' · ' + where if where else ''}")
        else:
            lines.append("ไม่มีวัคซีนใกล้ครบกำหนดใน 7 วันนี้")
    except Exception:
        pass

    return "\n".join(lines)


_LINE_REPORT_WORDS = ("รายงาน", "ไฟล์", "pdf", "PDF")


def _is_line_report_command(text: str) -> bool:
    return (
        any(v in text for v in _LINE_SEND_VERBS)
        and any(w in text for w in _LINE_WORDS)
        and any(w in text for w in _LINE_REPORT_WORDS)
    )


def _send_line_vaccine_report() -> str:
    """ส่งรายงานวัคซีนเข้า LINE

    LINE ไม่มีข้อความประเภท "ไฟล์" (แนบ PDF ตรง ๆ ไม่ได้) เลยส่ง 2 อย่างคู่กัน:
      1) รูปภาพรายงาน — เห็นเนื้อหาในแชทเลย กดเซฟลงมือถือได้
      2) ลิงก์ PDF ฉบับเต็ม — เผื่อต้องการไฟล์จริงไปพิมพ์/ส่งต่อ
    """
    if not LINE_CHANNEL_ACCESS_TOKEN:
        return "ยังไม่ได้ตั้งค่า LINE ครับ ต้องใส่ LINE_CHANNEL_ACCESS_TOKEN ในระบบก่อน"
    if not PUBLIC_BASE_URL:
        return "ยังส่งรายงานไม่ได้ครับ เพราะระบบยังรันอยู่แค่ในเครื่อง (localhost) ต้องมี URL สาธารณะก่อน"

    # token ชั่วคราว ให้เปิดจาก LINE ได้โดยไม่ต้องล็อกอิน (และ LINE เองก็ต้องโหลดรูปผ่าน URL นี้)
    img_url = f"{PUBLIC_BASE_URL}/export/vaccine-log.png?t={_issue_download_token()}"
    pdf_url = f"{PUBLIC_BASE_URL}/export/vaccine-log.pdf?t={_issue_download_token()}"

    ok = _send_line_messages([
        {"type": "image", "originalContentUrl": img_url, "previewImageUrl": img_url},
        {
            "type": "text",
            "text": (
                "รายงานประวัติการฉีดวัคซีน · ฟาร์มมี่\n"
                f"ไฟล์ PDF ฉบับเต็ม (ลิงก์หมดอายุใน {DOWNLOAD_TOKEN_TTL_MIN} นาที):\n{pdf_url}"
            ),
        },
    ])
    return "ส่งรายงานวัคซีนเข้า LINE แล้วครับ (ทั้งรูปและไฟล์ PDF)" if ok else "ส่ง LINE ไม่สำเร็จครับ ลองใหม่อีกครั้ง"


def _send_line_summary_from_voice() -> str:
    """สร้างสรุปฟาร์มจากข้อมูลจริงแล้วส่งเข้า LINE คืนข้อความยืนยันให้พูดกลับ"""
    if not LINE_CHANNEL_ACCESS_TOKEN:
        return "ยังไม่ได้ตั้งค่า LINE ครับ ต้องใส่ LINE_CHANNEL_ACCESS_TOKEN ในระบบก่อน"
    summary = _build_farm_summary_for_line()
    ok = _send_line_broadcast(summary)
    return "ส่งสรุปฟาร์มเข้า LINE แล้วครับ" if ok else "ส่ง LINE ไม่สำเร็จครับ ลองใหม่อีกครั้ง"


def _recent_pig_health(limit: int = 14) -> list[dict]:
    res = (
        supabase.table("pig_health_log")
        .select("*")
        .order("log_date", desc=True)
        .limit(limit)
        .execute()
    )
    return res.data or []


def _fmt_pig_health(rows: list[dict]) -> str:
    if not rows:
        return "บันทึกสุขภาพหมู: ยังไม่มีข้อมูล"
    lines = [
        f"  {r['log_date']}: ป่วย {r['sick_count']} ตัว"
        + (f" จากทั้งหมด {r['total_count']} ตัว" if r.get("total_count") is not None else "")
        + (f" ({r['note']})" if r.get("note") else "")
        for r in rows
    ]
    return f"บันทึกจำนวนหมูป่วยรายวัน (ล่าสุดก่อน):\n" + "\n".join(lines)


def _recent_vaccine_log(limit: int = 14) -> list[dict]:
    res = (
        supabase.table("vaccine_log")
        .select("*")
        .order("log_date", desc=True)
        .limit(limit)
        .execute()
    )
    return res.data or []


def _fmt_vaccine_log(rows: list[dict]) -> str:
    if not rows:
        return "บันทึกการฉีดวัคซีน: ยังไม่มีข้อมูล"
    lines = [
        f"  {r['log_date']}: {r.get('vaccine_name') or 'วัคซีน (ไม่ระบุชื่อ)'}"
        for r in rows
    ]
    return "บันทึกการฉีดวัคซีน (ล่าสุดก่อน):\n" + "\n".join(lines)


def _fmt_stats(s: dict) -> str:
    t, h, w, r, l = s["temperature"], s["humidity"], s["windspeed"], s["rainfall"], s["light"]
    return (
        f"สถิติย้อนหลัง {s['days']} วัน ({s['reading_count']} รายการอ่าน):\n"
        f"  อุณหภูมิ เฉลี่ย {t['avg']:.1f}°C (ต่ำสุด {t['min']:.1f}, สูงสุด {t['max']:.1f})\n"
        f"  ความชื้น เฉลี่ย {h['avg']:.1f}% (ต่ำสุด {h['min']:.1f}, สูงสุด {h['max']:.1f})\n"
        f"  ลม เฉลี่ย {w['avg']:.1f} m/s (สูงสุด {w['max']:.1f})\n"
        f"  ฝนรวม {r['sum']:.1f} mm ({r['rainy_readings']} ครั้งที่มีฝน)\n"
        f"  แสง เฉลี่ย {l['avg']:.0f} lux"
        if t["avg"] is not None else f"ยังไม่มีข้อมูลย้อนหลัง {s['days']} วัน"
    )


def _build_context(detailed: bool = False, stats_days: Optional[int] = None, pig: bool = False) -> str:
    """สร้าง CONTEXT ให้ LLM
    detailed=False -> แนบแค่ค่าปัจจุบัน 1 บรรทัด (ประหยัด token, ใช้กับคำถามทั่วไป)
    detailed=True  -> แนบประวัติย้อนหลัง + ตารางพยากรณ์ (ใช้เฉพาะคำถามพยากรณ์/แนวโน้ม)
    stats_days     -> ถ้ามีค่า จะแนบสรุปสถิติย้อนหลังกี่วัน (ใช้เฉพาะคำถามเชิงประวัติ/สถิติ)
    pig            -> ถ้า True จะแนบบันทึกสุขภาพหมูย้อนหลัง (ใช้เฉพาะคำถามเกี่ยวกับหมู)
    """
    parts = []

    cur = weather()
    parts.append(
        "ค่าปัจจุบัน (" + (cur.get("reading_time") or "ไม่ทราบเวลา") + "): "
        + f"อุณหภูมิ {cur['temperature']}°C, ความชื้น {cur['humidity']}%, "
        + f"ลม {cur['windspeed']} m/s, ฝน {cur['rainfall']} mm, แสง {cur['light']} lux"
    )

    if stats_days:
        try:
            parts.append(_fmt_stats(stats(stats_days)))
        except Exception:
            pass

    if pig:
        parts.append(_PIG_BREEDS_INFO)
        try:
            parts.append(_fmt_pig_health(_recent_pig_health()))
        except Exception:
            pass
        try:
            parts.append(_fmt_vaccine_log(_recent_vaccine_log()))
        except Exception:
            pass

    if not detailed:
        return "\n\n".join(parts)

    try:
        hist = history()
        if hist:
            sample = hist[-6:]  # ~ค่าอ่านล่าสุดไม่กี่จุด (จำกัดเพื่อประหยัด token)
            lines = [
                f"  {h['time']}: {h['temperature']}°C, {h['humidity']}%, "
                f"ลม {h['windspeed']} m/s, ฝน {h['rainfall']} mm"
                for h in sample
            ]
            parts.append("ประวัติย้อนหลัง 1 ชั่วโมง (ล่าสุดท้ายสุด):\n" + "\n".join(lines))
    except Exception:
        pass

    try:
        fc = predict()
        lines = [
            f"  {r['hour']}: {r['temperature']}°C, {r['humidity']}%, "
            f"ลม {r['windspeed']} m/s, ฝน {r['rainfall']} mm"
            for r in fc
        ]
        parts.append("ตารางพยากรณ์ล่วงหน้ารายชั่วโมง:\n" + "\n".join(lines))
    except Exception:
        pass

    return "\n\n".join(parts)


def _rule_based_answer(text: str) -> str:
    """คำตอบสำรองเมื่อยังไม่ได้ตั้งค่า LLM — ฉลาดขึ้นด้วยการอ้างอิงพยากรณ์/แนวโน้ม/สถิติย้อนหลัง/หมู"""
    w = read_sensor()

    if _needs_pig(text):
        try:
            rows = _recent_pig_health(limit=2)
            if rows:
                latest = rows[0]
                msg = f"บันทึกล่าสุด ({latest['log_date']}) หมูป่วย {latest['sick_count']} ตัว"
                if latest.get("total_count") is not None:
                    msg += f" จากทั้งหมด {latest['total_count']} ตัว"
                if len(rows) > 1:
                    diff = latest["sick_count"] - rows[1]["sick_count"]
                    if diff > 0:
                        msg += f" (เพิ่มขึ้น {diff} ตัวจากวันก่อนหน้า)"
                    elif diff < 0:
                        msg += f" (ลดลง {-diff} ตัวจากวันก่อนหน้า)"
                return msg + " ครับ"
        except Exception:
            pass

    stats_days = _needs_stats(text)
    if stats_days:
        try:
            s = stats(stats_days)
            t = s["temperature"]
            if t["avg"] is not None:
                return (
                    f"ย้อนหลัง {stats_days} วัน อุณหภูมิเฉลี่ย {t['avg']:.1f}°C "
                    f"(ต่ำสุด {t['min']:.1f}, สูงสุด {t['max']:.1f}) "
                    f"ฝนตกรวม {s['rainfall']['sum']:.1f} mm ครับ"
                )
        except Exception:
            pass

    if _needs_forecast(text):
        try:
            fc = predict()
            nxt = fc[1] if len(fc) > 1 else None
            if nxt:
                trend = "สูงขึ้น" if (nxt["temperature"] or 0) > (w.temperature or 0) else "ลดลง"
                rain = "มีโอกาสฝนตก" if (nxt["rainfall"] or 0) > 0 else "ยังไม่มีฝน"
                return (
                    f"ช่วง {nxt['hour']} คาดว่าอุณหภูมิจะ{trend} อยู่ที่ราว {nxt['temperature']}°C "
                    f"ความชื้น {nxt['humidity']}% และ{rain}ครับ"
                )
        except Exception:
            pass

    if "อุณหภูมิ" in text or "ร้อน" in text or "หนาว" in text:
        note = " อากาศค่อนข้างร้อน" if (w.temperature or 0) >= 35 else ""
        return f"ตอนนี้อุณหภูมิ {w.temperature}°C ครับ{note}"
    if "ฝน" in text:
        return "ตอนนี้มีฝนตกครับ" if (w.rainfall or 0) > 0 else "ตอนนี้ยังไม่มีฝนครับ"
    if "ชื้น" in text:
        return f"ความชื้นอยู่ที่ {w.humidity}% ครับ"
    if "ลม" in text:
        return f"ความเร็วลมอยู่ที่ {w.windspeed} m/s ครับ"
    if "แสง" in text or "สว่าง" in text:
        return f"ความเข้มแสงอยู่ที่ {w.light} lux ครับ"

    return "ขณะนี้ " + _fmt_weather(w) + " ครับ"


MAX_HISTORY_TURNS = 3  # เก็บแชทย้อนหลังกี่เทิร์นล่าสุด (ประหยัด token/TPM)


def _ollama_answer(text: str, context: str, history: Optional[list[ChatTurn]]) -> Optional[str]:
    """ลองตอบด้วยโมเดล local ผ่าน Ollama (http://localhost:11434 โดย default)
    คืน None ถ้าต่อ Ollama ไม่ได้ (ยังไม่ได้ติดตั้ง/ปิดอยู่/โมเดลไม่มี) ให้ caller ไป fallback rule-based ต่อ
    """
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for turn in (history or [])[-MAX_HISTORY_TURNS * 2:]:
        role = "assistant" if turn.role == "model" else "user"
        messages.append({"role": role, "content": turn.text})
    messages.append({
        "role": "user",
        "content": f"CONTEXT (ข้อมูลจริงจากสถานี):\n{context}\n\nคำถาม: {text}",
    })

    try:
        resp = httpx.post(
            f"{OLLAMA_URL}/api/chat",
            json={
                "model": OLLAMA_MODEL,
                "messages": messages,
                "stream": False,
                # เผื่อพอสำหรับคำตอบภาษาไทยยาว 1-4 ประโยคแบบไม่โดนตัดกลางคำ
                # (ตัวเลขต่ำกว่านี้เร็วกว่าแต่มักโดนตัดกลางประโยคบนโมเดลเล็ก)
                "options": {"num_predict": 400},
                # กันโมเดลถูก unload ออกจาก RAM ระหว่างคำถาม ทำให้ต้องโหลดใหม่ (ช้ามาก) ทุกครั้ง
                "keep_alive": "30m",
            },
            # โมเดล local บน CPU โหลดเข้า RAM ครั้งแรกช้า (สิบกว่าวินาที) ให้เวลาพอสำหรับเคส cold start
            timeout=90,
        )
        resp.raise_for_status()
        answer = (resp.json().get("message", {}).get("content") or "").strip()
        return answer or None
    except Exception as e:
        print(f"[warn] Ollama ตอบไม่สำเร็จ: {e}")
        return None


@app.post("/ask", response_model=Answer)
def ask(q: Question):
    """ถาม-ตอบเรื่องสภาพอากาศ — ลำดับ: Gemini (ถ้ามีคีย์) -> Ollama local (ถ้ารันอยู่) -> rule-based

    ประหยัด token/ทรัพยากร:
    - แนบ CONTEXT แบบละเอียด (history+forecast) เฉพาะเมื่อคำถามเกี่ยวกับพยากรณ์/แนวโน้ม
      คำถามทั่วไปแนบแค่ค่าปัจจุบัน 1 บรรทัด
    - เก็บประวัติแชทแค่ MAX_HISTORY_TURNS เทิร์นล่าสุด
    - จำกัด max_output_tokens / num_predict
    """
    text = q.text.strip()
    if not text:
        return Answer(answer="ถามเรื่องสภาพอากาศได้เลยครับ เช่น อุณหภูมิ ความชื้น หรือพยากรณ์ล่วงหน้า")

    # คำสั่งส่งรายงาน PDF (ไฟล์) เข้า LINE ด้วยเสียง -> เช็คก่อนคำสั่งส่งสรุปทั่วไป เพราะเจาะจงกว่า
    if _is_line_report_command(text):
        try:
            return Answer(answer=_send_line_vaccine_report())
        except Exception as e:
            print(f"[warn] ส่งรายงาน LINE ไม่สำเร็จ: {e}")
            return Answer(answer="ขออภัยครับ ส่งรายงานเข้า LINE ไม่สำเร็จ ลองใหม่อีกครั้งนะครับ")

    # คำสั่งส่งสรุปฟาร์มเข้า LINE ด้วยเสียง -> สร้างสรุปจากข้อมูลจริง + ส่งตรง ไม่ผ่าน AI
    if _is_line_send_command(text):
        try:
            return Answer(answer=_send_line_summary_from_voice())
        except Exception as e:
            print(f"[warn] ส่ง LINE ไม่สำเร็จ: {e}")
            return Answer(answer="ขออภัยครับ ส่งสรุปเข้า LINE ไม่สำเร็จ ลองใหม่อีกครั้งนะครับ")

    # คำสั่งบันทึกการฉีดวัคซีนด้วยเสียง -> บันทึกลง DB ตรง ๆ ไม่ผ่าน AI เลย (ต้องแม่นยำ ห้ามมั่ว)
    if _is_vaccine_record_command(text):
        try:
            return Answer(answer=_record_vaccine_from_voice(text))
        except Exception as e:
            print(f"[warn] บันทึกวัคซีนไม่สำเร็จ: {e}")
            return Answer(answer="ขออภัยครับ บันทึกไม่สำเร็จ ลองพูดใหม่อีกครั้งนะครับ")

    # ข้อมูลสายพันธุ์หมูตายตัว ไม่ผ่าน AI เลย กันมั่ว/หลุดประเด็นจากโมเดลเล็ก
    if _needs_pig_breed_info(text):
        return Answer(answer=_PIG_BREEDS_INFO.replace("ความรู้อ้างอิง: ", "") + " ครับ")

    context = _build_context(
        detailed=_needs_forecast(text),
        stats_days=_needs_stats(text),
        pig=_needs_pig(text),
    )

    # 1) Gemini ก่อน (ถ้าตั้งค่าคีย์ไว้) — ยิงครั้งเดียวต่อคำถาม ไม่ retry เพื่อไม่ให้เปลืองโควตา
    if _llm is not None:
        # ต่อบทสนทนาแบบ multi-turn: เอาประวัติล่าสุดไม่เกิน MAX_HISTORY_TURNS เทิร์น
        contents = []
        for turn in (q.history or [])[-MAX_HISTORY_TURNS * 2:]:
            role = "model" if turn.role == "model" else "user"
            contents.append({"role": role, "parts": [{"text": turn.text}]})
        contents.append({
            "role": "user",
            "parts": [{"text": f"CONTEXT (ข้อมูลจริงจากสถานี):\n{context}\n\nคำถาม: {text}"}],
        })

        try:
            resp = _llm.models.generate_content(
                model=GEMINI_MODEL,
                config={
                    "system_instruction": SYSTEM_PROMPT,
                    "max_output_tokens": 300,
                    # ปิด thinking: ประหยัด token/TPM และกันคำตอบถูกตัดจนเพี้ยน
                    "thinking_config": {"thinking_budget": 0},
                },
                contents=contents,
            )
            answer = (resp.text or "").strip()
            if answer:
                return Answer(answer=answer)
        except Exception as e:
            print(f"[warn] Gemini ตอบไม่สำเร็จ ลอง Ollama ต่อ: {e}")

    # 2) Ollama local (ถ้ารันอยู่ในเครื่อง) — ไม่มีค่าใช้จ่าย/ไม่จำกัดโควตา
    ollama_answer = _ollama_answer(text, context, q.history)
    if ollama_answer:
        return Answer(answer=ollama_answer)

    # 3) rule-based — ด่านสุดท้าย ตอบได้เสมอ ไม่มีทางพัง
    return Answer(answer=_rule_based_answer(text))


if __name__ == "__main__":
    import uvicorn
    # ใช้พอร์ต 8000 ตัวเดียวให้ตรงกับ Vite proxy (frontend/vite.config.js)
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
