# Build the React client once, then serve it from the same FastAPI container.
FROM node:22-bookworm-slim AS frontend-builder

WORKDIR /workspace/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build


FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080

WORKDIR /app

COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r /tmp/requirements.txt \
    && groupadd --system app \
    && useradd --system --gid app --create-home app

COPY --chown=app:app backend/ /app/backend/
COPY --from=frontend-builder --chown=app:app /workspace/frontend/dist/ /app/frontend/dist/

WORKDIR /app/backend
USER app

EXPOSE 8080

# Cloud Run supplies PORT. The shell form expands it while retaining 8080 for
# local Docker runs.
CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
