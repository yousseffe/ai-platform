FROM python:3.9-slim
RUN pip install --no-cache-dir fastapi uvicorn pandas numpy scikit-learn joblib
