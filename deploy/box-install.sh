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
apt-get update -qq || true
apt-get -f install -y -qq > /dev/null 2>&1 || true   # ซ่อมแพ็กเกจที่ค้าง ถ้ามี
# ลงทีละตัว ตัวไหนลงไม่ได้ก็ข้าม (บนกล่องบางตัวมีอยู่แล้ว หรือ apt ติดค้าง)
for pkg in git python3 python3-venv python3-pip curl ca-certificates; do
  apt-get install -y -qq "$pkg" > /dev/null 2>&1 || echo "  (ข้าม $pkg — ลงไม่ได้ อาจมีอยู่แล้ว)"
done
# ต้องมีอย่างน้อยสองตัวนี้ ไม่งั้นไปต่อไม่ได้
for need in git python3; do
  command -v "$need" >/dev/null 2>&1 || { echo "❌ ไม่มี $need บนกล่องและลงไม่ได้ — ต้องให้เจ้าของกล่องช่วยลง"; exit 1; }
done
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "  ลง Node.js จาก NodeSource (ของ Ubuntu เองชนกัน)"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1     && apt-get install -y -qq nodejs > /dev/null 2>&1 || true
fi
if ! command -v node >/dev/null 2>&1; then
  echo "  ⚠️  ลง Node ไม่ได้ — จะข้ามการสร้างหน้าเว็บ (backend ยังใช้ได้ หน้าเว็บใช้จาก Render ไปก่อน)"
  SKIP_WEB=1
else
  SKIP_WEB=0
  echo "  node $(node -v) · npm $(npm -v)"
fi

# ---------- 1.5) ของเก่าที่รันอยู่บนกล่อง ----------
# กล่องนี้อาจมี Farmy รุ่นเก่ารันอยู่ที่พอร์ต 8000 แล้ว (ผ่าน docker หรือ python ตรง ๆ)
# ต้องหยุดก่อน ไม่งั้นรุ่นใหม่เปิดพอร์ตไม่ได้ และยืมไฟล์ตั้งค่าของเก่ามาใช้ จะได้ไม่ต้องพิมพ์ค่าลับใหม่
say "ตรวจของเก่าที่พอร์ต $PORT"
OLD_ENV=""
# docker: หยุดคอนเทนเนอร์ที่ชื่อขึ้นต้น farmy หรือที่จับพอร์ตนี้อยู่
if command -v docker >/dev/null 2>&1; then
  for c in $(docker ps --format '{{.Names}}' 2>/dev/null | grep -E '^farmy|voice' || true); do
    echo "  หยุดคอนเทนเนอร์เก่า: $c"; docker stop "$c" >/dev/null 2>&1 || true
  done
  for c in $(docker ps --format '{{.Names}} {{.Ports}}' 2>/dev/null | grep ":$PORT->" | awk '{print $1}' || true); do
    echo "  หยุดคอนเทนเนอร์ที่จับพอร์ต $PORT: $c"; docker stop "$c" >/dev/null 2>&1 || true
  done
fi
# systemd อื่นที่ชื่อคล้ายกัน
for u in $(systemctl list-units --type=service --all --no-legend 2>/dev/null | awk '{print $1}' | grep -Ei 'farmy|voice-ai' | grep -v "^$SERVICE.service" || true); do
  echo "  หยุดบริการเก่า: $u"; systemctl stop "$u" || true; systemctl disable "$u" >/dev/null 2>&1 || true
done
# โปรเซสอื่นที่ยังจับพอร์ตอยู่ (uvicorn/python ที่รันมือ)
PIDS=$(ss -ltnp 2>/dev/null | grep ":$PORT " | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u || true)
for pid in $PIDS; do
  echo "  หยุดโปรเซสที่จับพอร์ต $PORT: pid $pid ($(ps -o comm= -p "$pid" 2>/dev/null))"
  kill "$pid" 2>/dev/null || true
done
# หาไฟล์ .env เก่า (เอาอันที่มี SUPABASE_URL) ไว้คัดลอกมาใช้
for f in /home/dev/*/backend/.env /home/dev/*/deploy/.env /home/dev/*/.env /root/*/backend/.env /root/*/.env; do
  [ -f "$f" ] && grep -q '^SUPABASE_URL=' "$f" 2>/dev/null && [ "$f" != "$APP_DIR/backend/.env" ] && { OLD_ENV="$f"; break; }
done
[ -n "$OLD_ENV" ] && echo "  พบไฟล์ตั้งค่าเก่า: $OLD_ENV (จะคัดลอกมาใช้)"

# ---------- 2) โค้ด ----------
mkdir -p "$(dirname "$APP_DIR")"
if [ -d "$APP_DIR/.git" ]; then
  say "ดึงโค้ดใหม่"
  git -C "$APP_DIR" pull --ff-only
else
  if [ -d "$APP_DIR" ] && [ -n "$(ls -A "$APP_DIR" 2>/dev/null)" ]; then
    # ของเก่าวางอยู่ที่เดียวกันแต่ไม่ใช่ git — ย้ายไปเก็บไว้ก่อน ไม่ลบ เผื่อต้องกลับไปดู
    OLD_DIR="${APP_DIR}.old-$(date +%Y%m%d-%H%M%S)"
    say "พบของเก่าที่ $APP_DIR — ย้ายไปเก็บที่ $OLD_DIR"
    mv "$APP_DIR" "$OLD_DIR"
    # ค่าลับของเก่าส่วนใหญ่อยู่ในนี้แหละ
    for f in "$OLD_DIR/backend/.env" "$OLD_DIR/.env" "$OLD_DIR/deploy/.env"; do
      [ -z "$OLD_ENV" ] && [ -f "$f" ] && grep -q '^SUPABASE_URL=' "$f" 2>/dev/null && OLD_ENV="$f"
    done
    [ -n "$OLD_ENV" ] && echo "  พบไฟล์ตั้งค่าเก่า: $OLD_ENV (จะคัดลอกมาใช้)"
  fi
  say "ดาวน์โหลดโค้ดครั้งแรก"
  git clone --depth 1 "$REPO" "$APP_DIR"
fi
cd "$APP_DIR"

# ---------- 3) เซิร์ฟเวอร์ Python ----------
say "ติดตั้งไลบรารี Python"
if [ ! -d backend/venv ]; then
  python3 -m venv backend/venv 2>/dev/null || python3 -m venv --without-pip backend/venv
fi
if [ ! -x backend/venv/bin/pip ]; then
  # venv ไม่มี pip มาด้วย (ubuntu ตัดออก) — โหลดมาลงเอง
  curl -fsSL https://bootstrap.pypa.io/get-pip.py | backend/venv/bin/python - -q
fi
backend/venv/bin/pip install -q --upgrade pip
backend/venv/bin/pip install -q -r backend/requirements.txt

# ---------- 4) หน้าเว็บ (build ให้เสิร์ฟจากพอร์ตเดียวกับเซิร์ฟเวอร์) ----------
if [ "$SKIP_WEB" = 0 ]; then
  say "สร้างหน้าเว็บ"
  cd frontend
  npm ci --silent
  # VITE_API_BASE ว่าง = หน้าเว็บเรียก API ที่โดเมนเดียวกัน (พอร์ตเดียว)
  VITE_API_BASE="" npm run build --silent
  cd ..
fi

# ---------- 5) ไฟล์ตั้งค่า ----------
if [ ! -f backend/.env ]; then
  if [ -n "$OLD_ENV" ]; then
    say "คัดลอกค่าลับจากของเก่า: $OLD_ENV"
    cp "$OLD_ENV" backend/.env
    # ค่าที่รุ่นใหม่ต้องใช้แต่ของเก่าอาจยังไม่มี — เติมให้ครบ (ว่างไว้ให้เติมทีหลัง)
    for k in SIGNUP_CODE LAB_API_KEY PUBLIC_SITE_URL CRON_KEY; do
      grep -q "^$k=" backend/.env || echo "$k=" >> backend/.env
    done
    NEED_ENV=0
  else
    say "สร้างไฟล์ตั้งค่า backend/.env — ต้องเติมค่าลับก่อนใช้งาน"
    cp backend/.env.example backend/.env
    NEED_ENV=1
  fi
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
