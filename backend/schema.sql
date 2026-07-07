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

