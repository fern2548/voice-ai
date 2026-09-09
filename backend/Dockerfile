# เซิร์ฟเวอร์ Farmy Voice
FROM python:3.11-slim

# ตั้งให้ log ออกมาทันที ไม่ค้างใน buffer เวลาดูด้วย docker compose logs
ENV PYTHONUNBUFFERED=1 \
    PYTHONIOENCODING=utf-8 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# คัดลอกรายการไลบรารีก่อนโค้ด เพื่อให้ Docker ใช้ชั้นที่แคชไว้ซ้ำได้
# แก้โค้ดแล้ว build ใหม่จะไม่ต้องติดตั้งไลบรารีใหม่ทั้งหมด
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# ใช้พอร์ตจากตัวแปรถ้ามี ไม่มีก็ 8000 (เผื่อเอาไปวางบนโฮสต์ที่กำหนดพอร์ตให้เอง)
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
