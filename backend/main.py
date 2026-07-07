"""
Weather Station AI - FastAPI backend

Endpoints (แปลงมาจาก weather_predict.py เดิม):
  GET  /weather   -> ค่าปัจจุบันจากเซนเซอร์ (ล่าสุดที่ Node-RED ส่งเข้ามา)
  GET  /history   -> ข้อมูลย้อนหลัง 1 ชั่วโมง
  GET  /predict   -> ตารางทำนายสภาพอากาศ
  POST /ask       -> ถาม-ตอบเรื่องสภาพอากาศ (AI)
  POST /ingest    -> Node-RED ยิงค่าเซนเซอร์เข้ามาที่นี่

รันด้วย:  python main.py   (หรือ uvicorn main:app --host 0.0.0.0 --port 8000 --reload)
  -> ใช้พอร์ต 8000 เสมอ ให้ตรงกับ Vite proxy ฝั่ง frontend
"""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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


def verify_ingest_token(x_ingest_token: str = Header(...)) -> None:
    if x_ingest_token != INGEST_TOKEN:
        raise HTTPException(status_code=401, detail="invalid ingest token")

app = FastAPI(title="Weather Station AI")

# อนุญาตให้ frontend (Vite dev server) เรียกได้
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # production ควรระบุ origin จริง
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    "คุณคือผู้ช่วย AI ของสถานีตรวจอากาศอัจฉริยะ (Weather Station AI) ที่ฟาร์มสระบุรี "
    "ช่วยเกษตรกร/ผู้ดูแลฟาร์มเข้าใจสภาพอากาศและให้คำแนะนำเชิงปฏิบัติ\n"
    "แนวทางการตอบ:\n"
    "- ใช้ตัวเลขสภาพอากาศจาก CONTEXT เป็นข้อมูลอ้างอิงหลัก และตอบคำถามให้ครบถ้วนเสมอ\n"
    "- ตอบเป็นภาษาไทย สุภาพ กระชับ ลงท้ายด้วย 'ครับ'\n"
    "- อ้างอิงตัวเลขจริงพร้อมหน่วยเมื่อเกี่ยวข้อง\n"
    "- ถ้าถามพยากรณ์/แนวโน้ม ให้ดูตารางพยากรณ์และประวัติย้อนหลัง แล้วสรุปทิศทาง (สูงขึ้น/ลดลง/ทรงตัว)\n"
    "- ถ้าผู้ใช้ขอคำแนะนำ (เช่น การดูแลพืช ตากผ้า รดน้ำ) ให้แนะนำโดยอิงจากสภาพอากาศปัจจุบัน/พยากรณ์ ตามความรู้ทั่วไปได้\n"
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


def _needs_forecast(text: str) -> bool:
    return any(k in text for k in _FORECAST_KEYWORDS)


def _build_context(detailed: bool = False) -> str:
    """สร้าง CONTEXT ให้ LLM
    detailed=False -> แนบแค่ค่าปัจจุบัน 1 บรรทัด (ประหยัด token, ใช้กับคำถามทั่วไป)
    detailed=True  -> แนบประวัติย้อนหลัง + ตารางพยากรณ์ (ใช้เฉพาะคำถามพยากรณ์/แนวโน้ม)
    """
    parts = []

    cur = weather()
    parts.append(
        "ค่าปัจจุบัน (" + (cur.get("reading_time") or "ไม่ทราบเวลา") + "): "
        + f"อุณหภูมิ {cur['temperature']}°C, ความชื้น {cur['humidity']}%, "
        + f"ลม {cur['windspeed']} m/s, ฝน {cur['rainfall']} mm, แสง {cur['light']} lux"
    )

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
    """คำตอบสำรองเมื่อยังไม่ได้ตั้งค่า LLM — ฉลาดขึ้นด้วยการอ้างอิงพยากรณ์/แนวโน้ม"""
    w = read_sensor()

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


@app.post("/ask", response_model=Answer)
def ask(q: Question):
    """ถาม-ตอบเรื่องสภาพอากาศ — ใช้ Gemini ถ้ามีคีย์, ไม่งั้น fallback rule-based

    ประหยัด token:
    - แนบ CONTEXT แบบละเอียด (history+forecast) เฉพาะเมื่อคำถามเกี่ยวกับพยากรณ์/แนวโน้ม
      คำถามทั่วไปแนบแค่ค่าปัจจุบัน 1 บรรทัด
    - เก็บประวัติแชทแค่ MAX_HISTORY_TURNS เทิร์นล่าสุด
    - จำกัด max_output_tokens
    """
    text = q.text.strip()
    if not text:
        return Answer(answer="ถามเรื่องสภาพอากาศได้เลยครับ เช่น อุณหภูมิ ความชื้น หรือพยากรณ์ล่วงหน้า")

    if _llm is None:
        return Answer(answer=_rule_based_answer(text))

    context = _build_context(detailed=_needs_forecast(text))

    # ต่อบทสนทนาแบบ multi-turn: เอาประวัติล่าสุดไม่เกิน MAX_HISTORY_TURNS เทิร์น
    contents = []
    for turn in (q.history or [])[-MAX_HISTORY_TURNS * 2:]:
        role = "model" if turn.role == "model" else "user"
        contents.append({"role": role, "parts": [{"text": turn.text}]})
    contents.append({
        "role": "user",
        "parts": [{"text": f"CONTEXT (ข้อมูลจริงจากสถานี):\n{context}\n\nคำถาม: {text}"}],
    })

    # ยิง API ครั้งเดียวต่อคำถาม (free tier จำกัด ~20 req/วัน/โมเดล) — พลาดเมื่อไรใช้ rule-based ทันที
    # ไม่ retry/ไม่สลับโมเดล เพื่อไม่ให้เปลืองโควตา
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
        print(f"[warn] LLM ตอบไม่สำเร็จ ใช้ fallback: {e}")

    return Answer(answer=_rule_based_answer(text))


if __name__ == "__main__":
    import uvicorn
    # ใช้พอร์ต 8000 ตัวเดียวให้ตรงกับ Vite proxy (frontend/vite.config.js)
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
