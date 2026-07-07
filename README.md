# Weather Station AI

แยกโครงสร้างจากไฟล์ `index.html` เดี่ยว ๆ เป็น **frontend (React + Vite)** และ **backend (FastAPI)**

```
dashboard/
├── backend/          # FastAPI
│   ├── main.py       # endpoints: /weather /history /predict /ask
│   └── requirements.txt
└── frontend/         # React + Vite
    ├── index.html
    ├── vite.config.js   # proxy API -> localhost:8000
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
uvicorn main:app --reload --port 8000
```

## รัน frontend
```bash
cd frontend
npm install
npm run dev        # เปิด http://localhost:5173
```

Vite จะ proxy `/weather /history /predict /ask` ไปที่ backend พอร์ต 8000 ให้อัตโนมัติ

## สิ่งที่ต้องเสียบต่อ (TODO)
- `backend/main.py` → `read_sensor()` แทนที่ด้วยการอ่านค่าเซนเซอร์จริงจาก `weather_predict.py`
- `predict()` → เสียบโมเดลทำนายจริง
- `ask()` → เชื่อม LLM / logic ถาม-ตอบเดิม
- เก็บ history ลง DB/ไฟล์แทน in-memory
