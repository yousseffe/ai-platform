FROM python:3.11-slim
RUN pip install --no-cache-dir fastapi uvicorn pandas numpy scikit-learn joblib
