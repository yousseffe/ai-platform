FROM python:3.11-slim
RUN pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu fastapi uvicorn pandas numpy torch torchvision
RUN pip install --no-cache-dir opentelemetry-api opentelemetry-sdk opentelemetry-exporter-otlp-proto-http opentelemetry-instrumentation-fastapi
