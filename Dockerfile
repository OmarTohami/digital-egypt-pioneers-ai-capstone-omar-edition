FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (updated for Debian Trixie)
# Added libegl1 for MediaPipe EGL support
RUN apt-get update && apt-get install -y \
    libsm6 libxext6 libxrender-dev \
    libgl1 \
    libglib2.0-0 \
    libgles2 \
    libegl1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Expose port (Railway sets $PORT dynamically)
EXPOSE 8000

# Run the app with dynamic port support for Railway
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
