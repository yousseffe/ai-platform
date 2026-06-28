FROM python:3.11-slim
RUN pip install --no-cache-dir fastapi uvicorn pandas numpy scikit-learn joblib
RUN pip install --no-cache-dir opentelemetry-api opentelemetry-sdk opentelemetry-exporter-otlp-proto-http opentelemetry-instrumentation-fastapi
