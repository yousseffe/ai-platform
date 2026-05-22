from fastapi import FastAPI, Request
import joblib
import sys
import os
import uvicorn
import importlib.util
import numpy as np

app = FastAPI()

# Load model
model_path = os.getenv("MODEL_PATH", "model.pkl")
model = joblib.load(model_path)

# Load preprocess if exists
preprocess_func = None
preprocess_path = os.getenv("PREPROCESS_PATH")
if preprocess_path and os.path.exists(preprocess_path):
    spec = importlib.util.spec_from_file_location("preprocess", preprocess_path)
    preprocess_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(preprocess_module)
    if hasattr(preprocess_module, "preprocess"):
        preprocess_func = preprocess_module.preprocess

# Load postprocess if exists
postprocess_func = None
postprocess_path = os.getenv("POSTPROCESS_PATH")
if postprocess_path and os.path.exists(postprocess_path):
    spec = importlib.util.spec_from_file_location("postprocess", postprocess_path)
    postprocess_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(postprocess_module)
    if hasattr(postprocess_module, "postprocess"):
        postprocess_func = postprocess_module.postprocess

@app.post("/predict")
async def predict(request: Request):
    data = await request.json()
    
    # Preprocess must convert JSON to image array format (e.g. 3D/4D numpy array)
    if preprocess_func:
        data = preprocess_func(data)
    
    # Vision models expect a batch dimension (e.g., [batch, height, width, channels])
    if isinstance(data, list):
        data = np.array(data)
        
    # Inference
    prediction = model.predict(data)
    
    # Postprocess
    if postprocess_func:
        prediction = postprocess_func(prediction)
    
    if hasattr(prediction, "tolist"):
        prediction = prediction.tolist()
        
    if isinstance(prediction, dict):
        return prediction
        
    return {"prediction": prediction}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
