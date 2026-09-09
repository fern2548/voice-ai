# หน้าเว็บ Farmy Voice — build ด้วย Node แล้วเสิร์ฟด้วย nginx
# แยกสองชั้นเพื่อให้ภาพสุดท้ายมีแต่ไฟล์ที่ใช้จริง ไม่ติด node_modules ไปด้วย (เล็กลงหลายร้อยเมกะไบต์)

FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

# ที่อยู่เซิร์ฟเวอร์ต้องฝังตั้งแต่ตอน build เพราะ Vite แทนค่าลงในไฟล์ที่สร้างเสร็จแล้ว
# เปลี่ยนค่านี้ทีต้อง build ใหม่ ไม่ใช่แค่รีสตาร์ท
ARG VITE_API_BASE=""
ENV VITE_API_BASE=$VITE_API_BASE

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
