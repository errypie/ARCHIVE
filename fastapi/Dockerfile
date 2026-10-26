FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p static/documents

EXPOSE 8000

# Инициализируем БД (ждём PostgreSQL) и запускаем API
CMD ["sh", "-c", "python initdb.py && uvicorn main:app --host 0.0.0.0 --port 8000"]
