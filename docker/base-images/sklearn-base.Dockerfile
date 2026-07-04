FROM python:3.11-slim
RUN --mount=type=cache,target=/root/.cache/pip pip install fastapi uvicorn pandas numpy scikit-learn joblib
RUN --mount=type=cache,target=/root/.cache/pip pip install opentelemetry-api opentelemetry-sdk opentelemetry-exporter-otlp-proto-http opentelemetry-instrumentation-fastapi
