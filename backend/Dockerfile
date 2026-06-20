# ---- Build stage: paketlarni compile qilish uchun ----
FROM python:3.12-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ---- Final stage: yengil runtime muhiti, root emas ----
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Builder bosqichidan tayyor paketlarni olamiz (/usr/local - hamma uchun o'qiladigan joy)
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY . .

# Xavfsizlik: root emas, alohida kam huquqli user yaratamiz va unga /app'ni beramiz
RUN useradd --create-home --shell /bin/bash appuser \
    && mkdir -p uploaded_files \
    && chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]