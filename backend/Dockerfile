# Multi-stage build để giảm image size
FROM python:3.11-slim AS builder

WORKDIR /build

# System deps cho lightgbm + scipy
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt


FROM python:3.11-slim AS runtime

WORKDIR /app

# Runtime deps (chỉ libgomp cho lightgbm)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages từ builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy app code
COPY app/ ./app/
COPY artifacts/ ./artifacts/

ENV PORT=8000
EXPOSE 8000

# Healthcheck (dùng $PORT để hoạt động cả khi PaaS đổi port)
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD python -c "import os,urllib.request; urllib.request.urlopen(f\"http://localhost:{os.environ.get('PORT','8000')}/\").read()" || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
