#!/bin/bash
# ย้ายฐานข้อมูลจาก Supabase คลาวด์ มาไว้บนกล่อง Linux เครื่องเดียวกับ Farmy — ไม่ใช้ Docker
#
# ใช้กับกล่องที่ไม่มี Docker/systemd (คอนเทนเนอร์ที่ให้แค่พอร์ต 8000) ประกอบด้วย
#   PostgreSQL  (จาก apt)              — เก็บข้อมูลจริง
#   PostgREST   (ไบนารีตัวเดียว)        — ทำหน้าที่แทน API ของ Supabase ให้โค้ดเดิมใช้ได้ไม่ต้องแก้
#   backup loop                        — สำรองทุกคืน 02:00 เก็บ 14 วัน
# ทั้งหมดฟังแค่ 127.0.0.1 (ในกล่อง) ไม่เปิดออกนอก
#
#   วิธีใช้ (รันเป็น root หลังลง Farmy ด้วย box-install.sh แล้ว):
#     curl -fsSL https://raw.githubusercontent.com/fern2548/voice-ai/main/deploy/box-db-install.sh | bash
#
# ครั้งแรกจะคัดลอกข้อมูลทั้งหมดจากคลาวด์มาให้ (ค่าคลาวด์เดิมเก็บไว้ที่ backend/.env.cloud
# อยากกลับไปใช้คลาวด์: cp backend/.env.cloud backend/.env && bash start.sh)
# รันซ้ำได้ — จะแค่ตรวจ/ซ่อมส่วนที่ขาด ไม่ลบข้อมูล
set -euo pipefail

APP_DIR="${APP_DIR:-/home/dev/farmy}"
DB_DIR="${DB_DIR:-/home/dev/farmy-db}"      # ค่าลับ + ไบนารี + สำรอง (อยู่นอก git จะได้ไม่หายตอนลงโค้ดใหม่)
DB_NAME=farmy
PGREST_PORT=3000
PGREST_VER=v12.2.3
BACKUP_HOUR=2
BACKUP_KEEP_DAYS=14

say() { printf '\n\033[1;32m==> %s\033[0m\n' "$1"; }
die() { printf '\n\033[1;31m❌ %s\033[0m\n' "$1"; exit 1; }

[ -f "$APP_DIR/backend/.env" ] || die "ไม่พบ $APP_DIR/backend/.env — ลง Farmy ด้วย box-install.sh ก่อน"
mkdir -p "$DB_DIR/backups"
chmod 700 "$DB_DIR"

# ---------- 1) PostgreSQL ----------
say "ติดตั้ง PostgreSQL"
export DEBIAN_FRONTEND=noninteractive
if ! command -v psql >/dev/null 2>&1; then
  apt-get update -qq || true
  apt-get install -y -qq postgresql postgresql-contrib xz-utils > /dev/null 2>&1 \
    || apt-get install -y -qq postgresql > /dev/null 2>&1 \
    || die "ลง postgresql ไม่ได้ (apt) — ต้องให้เจ้าของกล่องช่วยลง"
fi
apt-get install -y -qq xz-utils > /dev/null 2>&1 || true
PG_VER=$(ls /usr/lib/postgresql 2>/dev/null | sort -V | tail -1)
[ -n "$PG_VER" ] || die "หาเวอร์ชัน postgresql ไม่เจอ"
echo "  postgresql $PG_VER"

# กล่องไม่มี systemd — สั่งผ่าน init script / pg_ctlcluster ตรง ๆ
pg_up() { su postgres -c "psql -tAc 'select 1'" >/dev/null 2>&1; }
if ! pg_up; then
  service postgresql start >/dev/null 2>&1 || pg_ctlcluster "$PG_VER" main start || true
  for i in $(seq 1 15); do pg_up && break; sleep 1; done
fi
pg_up || die "PostgreSQL ไม่ยอมเริ่ม — ดู: tail /var/log/postgresql/postgresql-$PG_VER-main.log"
echo "  PostgreSQL ทำงานแล้ว"

# ---------- 2) ค่าลับของฐานข้อมูล (สร้างครั้งเดียว) ----------
SECRETS="$DB_DIR/.env"
if [ ! -f "$SECRETS" ]; then
  say "สร้างค่าลับฐานข้อมูล → $SECRETS"
  python3 - "$SECRETS" <<'PY'
import secrets, sys
p = sys.argv[1]
open(p, "w").write(
    f"DB_PASSWORD={secrets.token_urlsafe(24)}\n"
    f"JWT_SECRET={secrets.token_urlsafe(48)}\n"
)
PY
  chmod 600 "$SECRETS"
fi
# shellcheck disable=SC1090
set -a; . "$SECRETS"; set +a
if [ -z "${SUPABASE_SERVICE_KEY:-}" ]; then
  # กุญแจที่ backend ใช้ยิงเข้า PostgREST (บทบาท service_role ทำได้ทุกอย่าง)
  (cd "$DB_DIR" && python3 "$APP_DIR/deploy/make-key.py" | grep '^SUPABASE_SERVICE_KEY=' >> "$SECRETS")
  set -a; . "$SECRETS"; set +a
fi

# ---------- 3) ฐานข้อมูล + บทบาท + ตาราง ----------
say "สร้างฐานข้อมูล $DB_NAME และตาราง"
su postgres -c "psql -tAc \"select 1 from pg_database where datname='$DB_NAME'\"" | grep -q 1 \
  || su postgres -c "createdb $DB_NAME"

# บทบาทแบบเดียวกับ Supabase: authenticator (ล็อกอินได้แต่ไร้สิทธิ์) สวมบท anon / service_role ตามกุญแจ
su postgres -c "psql -v ON_ERROR_STOP=1 -d $DB_NAME" <<SQL > /dev/null
do \$\$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin noinherit bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname='authenticator') then create role authenticator noinherit login; end if;
end \$\$;
alter role authenticator password '$DB_PASSWORD';
grant anon, authenticated, service_role to authenticator;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant select on tables to anon, authenticated;
SQL
su postgres -c "psql -q -v ON_ERROR_STOP=1 -d $DB_NAME -f $APP_DIR/deploy/db/02-schema.sql" > /dev/null
su postgres -c "psql -q -v ON_ERROR_STOP=1 -d $DB_NAME -f $APP_DIR/deploy/db/03-grants.sql" > /dev/null
echo "  ตารางพร้อม"

# ---------- 4) PostgREST ----------
if [ ! -x "$DB_DIR/postgrest" ]; then
  say "ดาวน์โหลด PostgREST $PGREST_VER"
  URL="https://github.com/PostgREST/postgrest/releases/download/$PGREST_VER/postgrest-$PGREST_VER-linux-static-x64.tar.xz"
  curl -fsSL "$URL" -o /tmp/postgrest.tar.xz || die "โหลด PostgREST ไม่ได้ ($URL)"
  tar -xJf /tmp/postgrest.tar.xz -C "$DB_DIR" postgrest
  chmod +x "$DB_DIR/postgrest"; rm -f /tmp/postgrest.tar.xz
fi
cat > "$DB_DIR/postgrest.conf" <<EOF
db-uri = "postgres://authenticator:$DB_PASSWORD@127.0.0.1:5432/$DB_NAME"
db-schemas = "public"
db-anon-role = "anon"
jwt-secret = "$JWT_SECRET"
server-host = "127.0.0.1"
server-port = $PGREST_PORT
db-pool = 10
EOF
chmod 600 "$DB_DIR/postgrest.conf"

# ---------- 5) สคริปต์เริ่ม (postgres → postgrest → backup loop) ----------
cat > "$DB_DIR/start-db.sh" <<EOF
#!/bin/bash
# เริ่มฐานข้อมูลของ Farmy — เรียกจาก autostart.sh ตอนกล่องรีสตาร์ท หรือรันมือได้
su postgres -c "psql -tAc 'select 1'" >/dev/null 2>&1 \\
  || service postgresql start >/dev/null 2>&1 || pg_ctlcluster $PG_VER main start || true
for i in \$(seq 1 20); do su postgres -c "psql -tAc 'select 1'" >/dev/null 2>&1 && break; sleep 1; done
pkill -f "$DB_DIR/postgrest" 2>/dev/null || true
sleep 1
nohup "$DB_DIR/postgrest" "$DB_DIR/postgrest.conf" >> "$DB_DIR/postgrest.log" 2>&1 &
pkill -f "$DB_DIR/backup-loop.sh" 2>/dev/null || true
nohup bash "$DB_DIR/backup-loop.sh" >> "$DB_DIR/backup.log" 2>&1 &
echo "farmy-db started (postgrest 127.0.0.1:$PGREST_PORT)"
EOF
chmod +x "$DB_DIR/start-db.sh"

cat > "$DB_DIR/backup-loop.sh" <<EOF
#!/bin/bash
# สำรองฐานข้อมูลทุกวัน ${BACKUP_HOUR}:00 เก็บย้อนหลัง $BACKUP_KEEP_DAYS วัน — ไฟล์อยู่ที่ $DB_DIR/backups
# กู้คืน:  gunzip -c <ไฟล์>.sql.gz | su postgres -c "psql -d $DB_NAME"
log() { echo "[\$(date '+%Y-%m-%d %H:%M:%S')] \$1"; }
run_backup() {
  F="$DB_DIR/backups/farmy-\$(date +%Y-%m-%d_%H%M).sql"
  if su postgres -c "pg_dump --clean --if-exists $DB_NAME" > "\$F" 2>/tmp/pgerr; then
    gzip -f "\$F"; log "สำเร็จ: \$F.gz (\$(du -h "\$F.gz" | cut -f1))"
  else
    rm -f "\$F"; log "ล้มเหลว: \$(head -3 /tmp/pgerr)"
  fi
  find "$DB_DIR/backups" -name 'farmy-*.sql.gz' -mtime +$BACKUP_KEEP_DAYS -delete
}
run_backup
while true; do
  M=\$(( ($BACKUP_HOUR - \$(date +%-H)) * 60 - \$(date +%-M) ))
  [ "\$M" -le 0 ] && M=\$(( M + 1440 ))
  sleep \$(( M * 60 ))
  run_backup
done
EOF
chmod +x "$DB_DIR/backup-loop.sh"

AUTOSTART=/home/dev/autostart.sh
touch "$AUTOSTART"; chmod +x "$AUTOSTART"
if ! grep -q "farmy-db/start-db.sh" "$AUTOSTART"; then
  # ต้องอยู่ "ก่อน" บรรทัดเริ่ม Farmy จะได้มีฐานข้อมูลรอตอนเซิร์ฟเวอร์ตื่น
  if grep -q "farmy/start.sh" "$AUTOSTART"; then
    sed -i "s#^bash $APP_DIR/start.sh#bash $DB_DIR/start-db.sh\nbash $APP_DIR/start.sh#" "$AUTOSTART"
  else
    echo "bash $DB_DIR/start-db.sh" >> "$AUTOSTART"
  fi
fi

say "เริ่ม PostgREST"
bash "$DB_DIR/start-db.sh"
sleep 2
curl -fsS -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" "http://127.0.0.1:$PGREST_PORT/vaccine_schedule?limit=1" > /dev/null \
  || die "PostgREST ไม่ตอบ — ดู $DB_DIR/postgrest.log"
echo "  PostgREST ตอบแล้ว"

# ---------- 6) คัดลอกข้อมูลจากคลาวด์ (ครั้งแรกเท่านั้น) ----------
ENV="$APP_DIR/backend/.env"
CUR_URL=$(grep '^SUPABASE_URL=' "$ENV" | cut -d= -f2- || true)
if echo "$CUR_URL" | grep -q 'supabase.co'; then
  say "คัดลอกข้อมูลจาก Supabase คลาวด์มาไว้บนกล่อง"
  [ -f "$APP_DIR/backend/.env.cloud" ] || cp "$ENV" "$APP_DIR/backend/.env.cloud"
  CLOUD_KEY=$(grep '^SUPABASE_SERVICE_KEY=' "$ENV" | cut -d= -f2-)
  PY="$APP_DIR/backend/venv/bin/python"; [ -x "$PY" ] || PY=python3
  "$PY" "$APP_DIR/deploy/migrate-from-cloud.py" --url "$CUR_URL" --key "$CLOUD_KEY" --out /tmp/farmy-data.sql
  su postgres -c "psql -q -v ON_ERROR_STOP=1 -d $DB_NAME -f /tmp/farmy-data.sql" > /dev/null
  rm -f /tmp/farmy-data.sql
  echo "  คัดลอกเสร็จ"
fi

# ---------- 7) ชี้ Farmy มาที่ฐานข้อมูลบนกล่อง ----------
say "ตั้งค่า backend ให้ใช้ฐานข้อมูลบนกล่อง"
set_env() { grep -q "^$1=" "$ENV" && sed -i "s#^$1=.*#$1=$2#" "$ENV" || echo "$1=$2" >> "$ENV"; }
set_env SUPABASE_URL "http://127.0.0.1:$PGREST_PORT"
set_env SUPABASE_SERVICE_KEY "$SUPABASE_SERVICE_KEY"
set_env SUPABASE_REST_DIRECT 1
bash "$APP_DIR/start.sh"
sleep 4

say "ตรวจสถานะ"
if curl -fsS "http://127.0.0.1:8000/health" | grep -q '"db":true'; then
  echo
  echo "✅ Farmy ใช้ฐานข้อมูลบนกล่องแล้ว"
  su postgres -c "psql -d $DB_NAME -tAc \"select 'weather_readings', count(*) from weather_readings union all select 'pig_health_log', count(*) from pig_health_log union all select 'vaccine_schedule', count(*) from vaccine_schedule union all select 'admin_users', count(*) from admin_users\"" | sed 's/|/: /; s/^/   /'
  echo
  echo "   ข้อมูล:   /var/lib/postgresql/$PG_VER/main"
  echo "   สำรอง:    $DB_DIR/backups (ทุกวัน ${BACKUP_HOUR}:00 เก็บ $BACKUP_KEEP_DAYS วัน)"
  echo "   ค่าลับ:   $DB_DIR/.env"
  echo "   กลับไปใช้คลาวด์: cp $APP_DIR/backend/.env.cloud $APP_DIR/backend/.env && bash $APP_DIR/start.sh"
else
  echo "⚠️  backend ยังต่อฐานข้อมูลไม่ได้ — ดู: tail -50 $APP_DIR/farmy.log"
fi
