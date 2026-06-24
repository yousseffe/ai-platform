FROM python:3.9-slim
RUN pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu fastapi uvicorn pandas numpy torch torchvision
