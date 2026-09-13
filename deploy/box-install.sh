#!/bin/bash
# ติดตั้ง Farmy Voice บนกล่อง Linux (Ubuntu/Debian) แบบพอร์ตเดียว — ไม่ใช้ Docker
#
# ใช้กับกล่องที่ให้กติกาว่า "ไฟล์ต้องอยู่ใน /home/dev" และ "เปิดได้พอร์ต 8000 พอร์ตเดียว"
# ฐานข้อมูลใช้ Supabase คลาวด์ตัวเดิม (ไม่ต้องลง Postgres บนกล่อง)
#
#   วิธีใช้ (รันเป็น root):
#     curl -fsSL https://raw.githubusercontent.com/fern2548/voice-ai/main/deploy/box-install.sh | bash
#   หรือ clone แล้ว:  bash deploy/box-install.sh
#
# รันซ้ำได้ — ครั้งต่อไปจะแค่ดึงโค้ดใหม่ สร้างหน้าเว็บใหม่ แล้วรีสตาร์ท
set -euo pipefail

APP_DIR="${APP_DIR:-/home/dev/farmy}"
REPO="${REPO:-https://github.com/fern2548/voice-ai.git}"
PORT="${PORT:-8000}"
SERVICE=farmy

say() { printf '\n\033[1;32m==> %s\033[0m\n' "$1"; }

# ---------- 1) โปรแกรมพื้นฐาน ----------
say "ติดตั้งโปรแกรมที่ต้องใช้ (git · python3 · node)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq git python3 python3-venv python3-pip nodejs npm curl > /dev/null

# ---------- 2) โค้ด ----------
mkdir -p "$(dirname "$APP_DIR")"
if [ -d "$APP_DIR/.git" ]; then
  say "ดึงโค้ดใหม่"
  git -C "$APP_DIR" pull --ff-only
else
  say "ดาวน์โหลดโค้ดครั้งแรก"
  git clone --depth 1 "$REPO" "$APP_DIR"
fi
cd "$APP_DIR"

# ---------- 3) เซิร์ฟเวอร์ Python ----------
say "ติดตั้งไลบรารี Python"
[ -d backend/venv ] || python3 -m venv backend/venv
backend/venv/bin/pip install -q --upgrade pip
backend/venv/bin/pip install -q -r backend/requirements.txt

# ---------- 4) หน้าเว็บ (build ให้เสิร์ฟจากพอร์ตเดียวกับเซิร์ฟเวอร์) ----------
say "สร้างหน้าเว็บ"
cd frontend
npm ci --silent
# VITE_API_BASE ว่าง = หน้าเว็บเรียก API ที่โดเมนเดียวกัน (พอร์ตเดียว)
VITE_API_BASE="" npm run build --silent
cd ..

# ---------- 5) ไฟล์ตั้งค่า ----------
if [ ! -f backend/.env ]; then
  say "สร้างไฟล์ตั้งค่า backend/.env — ต้องเติมค่าลับก่อนใช้งาน"
  cp backend/.env.example backend/.env
  NEED_ENV=1
else
  NEED_ENV=0
fi

# ---------- 6) ให้รันตลอดและเปิดเองตอนกล่องรีสตาร์ท ----------
say "ตั้งบริการให้รันตลอด"
cat > /etc/systemd/system/$SERVICE.service <<EOF
[Unit]
Description=Farmy Voice
After=network-online.target
Wants=network-online.target

[Service]
WorkingDirectory=$APP_DIR/backend
EnvironmentFile=$APP_DIR/backend/.env
Environment=PYTHONIOENCODING=utf-8
ExecStart=$APP_DIR/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port $PORT
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable -q $SERVICE
systemctl restart $SERVICE

sleep 4
say "ตรวจสถานะ"
if curl -fsS "http://127.0.0.1:$PORT/health" ; then
  echo
  echo "✅ Farmy Voice ทำงานแล้วที่พอร์ต $PORT"
else
  echo
  echo "⚠️  ยังไม่ตอบ ดู log ด้วย:  journalctl -u $SERVICE -n 40 --no-pager"
fi

if [ "$NEED_ENV" = 1 ]; then
  cat <<'MSG'

┌──────────────────────────────────────────────────────────────┐
│  ยังใช้ไม่ได้จนกว่าจะเติมค่าลับ                              │
│                                                              │
│    nano /home/dev/farmy/backend/.env                         │
│                                                              │
│  อย่างน้อยต้องมี SUPABASE_URL · SUPABASE_SERVICE_KEY         │
│  · INGEST_TOKEN · ADMIN_PASSWORD  แล้วสั่ง                   │
│                                                              │
│    systemctl restart farmy                                   │
└──────────────────────────────────────────────────────────────┘
MSG
fi
