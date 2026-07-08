# ---- Stage 1: Build frontend ----
FROM node:18-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build    # creates /frontend/dist

# ---- Stage 2: Final Python image ----
FROM python:3.11-slim

WORKDIR /app

# System dependencies (same as before)
RUN apt-get update && apt-get install -y \
    libsm6 libxext6 libxrender-dev \
    libgl1 libglib2.0-0 \
    libgles2 libegl1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Backend requirements
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Copy built frontend from stage 1
COPY --from=frontend-builder /frontend/dist /frontend/dist

EXPOSE 8000

# Run the app (PORT is set by Azure App Service automatically)
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
