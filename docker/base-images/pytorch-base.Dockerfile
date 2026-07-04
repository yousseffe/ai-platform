FROM python:3.11-slim
RUN --mount=type=cache,target=/root/.cache/pip pip install --extra-index-url https://download.pytorch.org/whl/cpu fastapi uvicorn pandas numpy torch torchvision
RUN --mount=type=cache,target=/root/.cache/pip pip install opentelemetry-api opentelemetry-sdk opentelemetry-exporter-otlp-proto-http opentelemetry-instrumentation-fastapi
