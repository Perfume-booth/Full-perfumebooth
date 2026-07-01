# ─── Django Backend Docker Image ──────────────────────────────────────────────
# Base: Python 3.12 slim (minimal Debian)
# Includes: libpq-dev for psycopg2, build-essential for C extensions
# ─────────────────────────────────────────────────────────────────────────────

FROM python:3.12-slim AS base

# Prevent .pyc files and enable unbuffered stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# ── System Dependencies ────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ── Python Dependencies ────────────────────────────────────────────────────────
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# ── Application Code ───────────────────────────────────────────────────────────
COPY . .

# ── Static & Media directories ─────────────────────────────────────────────────
RUN mkdir -p /app/static /app/media

# ── Non-root user for security ─────────────────────────────────────────────────
RUN addgroup --system --gid 1001 django && \
    adduser --system --uid 1001 --gid 1001 django && \
    chown -R django:django /app

USER django

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8000/api/health/ || exit 1
