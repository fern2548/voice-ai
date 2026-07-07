# Weather Station AI

แยกโครงสร้างจากไฟล์ `index.html` เดี่ยว ๆ เป็น **frontend (React + Vite)** และ **backend (FastAPI)**

```
dashboard/
├── backend/          # FastAPI
│   ├── main.py       # endpoints: /weather /history /predict /ask
│   └── requirements.txt
└── frontend/         # React + Vite
    ├── index.html
    ├── vite.config.js   # proxy API -> localhost:8000 (ตั้งค่าได้ผ่าน VITE_BACKEND_PORT)
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── api.js
        ├── styles.css
        ├── hooks/usePolling.js
        └── components/
            ├── WeatherCards.jsx
            ├── HistoryTable.jsx
            ├── PredictTable.jsx
            └── ChatBox.jsx
```

## รัน backend
```bash
cd backend
pip install -r requirements.txt
python main.py      # auto-fallback ลองพอร์ต 8000 -> 8001 -> 8002
```
ระบบจะพิมพ์บอกในเทอร์มินัลว่าได้พอร์ตไหน (เผื่อพอร์ต 8000 ถูกโปรเจกต์อื่น เช่น scada-frontend ใช้อยู่)
หรือระบุพอร์ตเองด้วย `uvicorn main:app --reload --port <พอร์ต>`

## รัน frontend
```bash
cd frontend
npm install
npm run dev        # เปิด http://localhost:5173
```

Vite จะ proxy `/weather /history /predict /predictions-log /ask` ไปที่ backend พอร์ต 8000 โดย default
ถ้า backend ไปลงพอร์ตอื่น (เช่น 8001) ให้รันด้วย `VITE_BACKEND_PORT=8001 npm run dev` แทน

## สิ่งที่ต้องเสียบต่อ (TODO)
- `backend/main.py` → `read_sensor()` แทนที่ด้วยการอ่านค่าเซนเซอร์จริงจาก `weather_predict.py`
- `predict()` → เสียบโมเดลทำนายจริง
- `ask()` → เชื่อม LLM / logic ถาม-ตอบเดิม
- เก็บ history ลง DB/ไฟล์แทน in-memory
