from fastapi import FastAPI, Request
import pickle
import sys
import os
import uvicorn
import importlib.util

app = FastAPI()

# Load model
model_path = os.getenv("MODEL_PATH", "model.pkl")
with open(model_path, 'rb') as f:
    model = pickle.load(f)

# Load scaler if exists
scaler = None
scaler_path = os.getenv("SCALER_PATH")
if scaler_path and os.path.exists(scaler_path):
    with open(scaler_path, 'rb') as f:
        scaler = pickle.load(f)

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
    
    # Preprocess
    if preprocess_func:
        data = preprocess_func(data)
    elif scaler:
        # Simple default behavior if scaler exists
        pass # In a real scenario, we'd know how to apply scaler
    
    # Inference
    # Assume data is in right format for model.predict
    # if it's a list or array
    prediction = model.predict([data] if not isinstance(data, list) else data)
    
    # Postprocess
    if postprocess_func:
        prediction = postprocess_func(prediction)
    
    # Convert numpy array to list if needed
    if hasattr(prediction, "tolist"):
        prediction = prediction.tolist()
        
    return {"prediction": prediction}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
