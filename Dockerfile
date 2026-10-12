# Jejak Kode dalam satu container: game (React, hasil build) + API (FastAPI).
# Dipakai Render (lihat render.yaml) dan hosting lain yang mendukung Docker.

# ---- tahap 1: build game (frontend)
FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- tahap 2: server (backend) yang juga menyajikan game
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./
COPY --from=frontend /app/frontend/dist /app/frontend/dist
EXPOSE 8000
# Render mengisi PORT sendiri. --proxy-headers supaya server tahu situsnya dibuka lewat HTTPS.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
