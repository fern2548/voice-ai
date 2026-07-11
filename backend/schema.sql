-- รันใน Supabase SQL Editor ครั้งเดียวตอนตั้งโปรเจกต์
create table if not exists weather_readings (
  id bigint generated always as identity primary key,
  temperature double precision,
  humidity double precision,
  windspeed double precision,
  rainfall double precision,
  light double precision,
  created_at timestamptz not null default now()
);

create index if not exists weather_readings_created_at_idx
  on weather_readings (created_at desc);

-- เก็บผลทำนายจากโมเดล LSTM (predicted_for = เวลาที่ทำนายว่าจะเป็นตอนนั้น)
-- ไว้เทียบกับ weather_readings จริงตาม target time ในภายหลัง
create table if not exists weather_predictions (
  id bigint generated always as identity primary key,
  predicted_for timestamptz,
  temperature_pred double precision,
  humidity_pred double precision,
  windspeed_pred double precision,
  rainfall_pred double precision,
  light_pred double precision,
  created_at timestamptz not null default now()
);

create index if not exists weather_predictions_predicted_for_idx
  on weather_predictions (predicted_for desc);

-- สรุปสถิติย้อนหลัง (เฉลี่ย/ต่ำสุด/สูงสุด) ให้ AI ใช้ตอบคำถามเชิงประวัติ เช่น
-- "สัปดาห์นี้ร้อนสุดกี่องศา" โดยคำนวณที่ฝั่ง Postgres (เร็วกว่าดึง raw rows มาคำนวณเอง)
create or replace function weather_stats(since timestamptz)
returns table (
  reading_count bigint,
  temperature_avg double precision,
  temperature_min double precision,
  temperature_max double precision,
  humidity_avg double precision,
  humidity_min double precision,
  humidity_max double precision,
  windspeed_avg double precision,
  windspeed_max double precision,
  rainfall_sum double precision,
  rainy_readings bigint,
  light_avg double precision
)
language sql stable as $$
  select
    count(1),
    avg(temperature), min(temperature), max(temperature),
    avg(humidity), min(humidity), max(humidity),
    avg(windspeed), max(windspeed),
    sum(rainfall), count(1) filter (where rainfall > 0),
    avg(light)
  from weather_readings
  where created_at >= since;
$$;

