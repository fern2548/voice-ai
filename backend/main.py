"""
Weather Station AI - FastAPI backend

Endpoints (แปลงมาจาก weather_predict.py เดิม):
  GET  /weather   -> ค่าปัจจุบันจากเซนเซอร์ (ล่าสุดที่ Node-RED ส่งเข้ามา)
  GET  /history   -> ข้อมูลย้อนหลัง 1 ชั่วโมง
  GET  /predict   -> ตารางทำนายสภาพอากาศ
  POST /ask       -> ถาม-ตอบเรื่องสภาพอากาศ (AI)
  POST /ingest    -> Node-RED ยิงค่าเซนเซอร์เข้ามาที่นี่

รันด้วย:  uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
INGEST_TOKEN = os.environ["INGEST_TOKEN"]
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


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


class Question(BaseModel):
    text: str


class Answer(BaseModel):
    answer: str


# ---------- แหล่งข้อมูลเซนเซอร์ ----------
# ค่าล่าสุดที่ Node-RED ส่งเข้ามาทาง /ingest ถูกเก็บใน Supabase
# ใช้ค่านี้เป็น fallback ตอนที่ยังไม่มีข้อมูลใน DB เลย
_FALLBACK = Weather(temperature=31.2, humidity=68, windspeed=2.4, rainfall=0.0, light=15000)


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
        lo = min(datetime.fromisoformat(t) for t in times) - timedelta(hours=1)
        hi = max(datetime.fromisoformat(t) for t in times) + timedelta(hours=1)
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
        target = datetime.fromisoformat(target_iso)
        return min(
            actuals,
            key=lambda a: abs(datetime.fromisoformat(a["created_at"]) - target),
        )

    bangkok = timezone(timedelta(hours=7))

    def fmt(iso, with_date=False):
        if not iso:
            return None
        dt = datetime.fromisoformat(iso).astimezone(bangkok)
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
    bangkok = timezone(timedelta(hours=7))
    if not res.data:
        w = _FALLBACK
        return {**w.model_dump(), "reading_time": None}
    r = res.data[0]
    reading_time = datetime.fromisoformat(r["created_at"]).astimezone(bangkok).strftime(
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
    bangkok = timezone(timedelta(hours=7))
    return [
        {
            "time": datetime.fromisoformat(r["created_at"]).astimezone(bangkok).strftime("%H:%M"),
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
    TODO: เสียบโมเดลทำนายจริงจาก weather_predict.py
    """
    now = read_sensor()
    base_hour = datetime.now()
    rows = [{
        "hour": base_hour.strftime("%H:00"),
        "is_now": True,
        **now.model_dump(),
    }]
    for i in range(1, 6):
        t = base_hour + timedelta(hours=i)
        rows.append({
            "hour": t.strftime("%H:00"),
            "is_now": False,
            "temperature": round((now.temperature or 30) - i * 0.4, 1),
            "humidity": round((now.humidity or 60) + i * 1.5, 1),
            "windspeed": round((now.windspeed or 2) + i * 0.1, 1),
            "rainfall": round(max(0, (now.rainfall or 0) + (i - 3) * 0.2), 1),
            "light": max(0, int((now.light or 10000) - i * 1500)),
        })
    return rows


@app.post("/ask", response_model=Answer)
def ask(q: Question):
    """
    ถาม-ตอบเรื่องสภาพอากาศ
    TODO: เชื่อมต่อ LLM/logic เดิมของ weather_predict.py
    """
    w = read_sensor()
    text = q.text.strip()
    if "อุณหภูมิ" in text or "ร้อน" in text:
        answer = f"ตอนนี้อุณหภูมิ {w.temperature}°C ครับ"
    elif "ฝน" in text:
        answer = "ฝนตก" if (w.rainfall or 0) > 0 else "ตอนนี้ยังไม่มีฝนครับ"
    elif "ชื้น" in text:
        answer = f"ความชื้นอยู่ที่ {w.humidity}% ครับ"
    else:
        answer = (
            f"ขณะนี้ อุณหภูมิ {w.temperature}°C ความชื้น {w.humidity}% "
            f"ลม {w.windspeed} m/s ครับ"
        )
    return Answer(answer=answer)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
