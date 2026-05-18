from fastapi import FastAPI, Request
import joblib
import sys
import os
import uvicorn
import importlib.util

app = FastAPI()

# Load model
model_path = os.getenv("MODEL_PATH", "model.pkl")
model = joblib.load(model_path)

# Load scaler if exists
scaler = None
scaler_path = os.getenv("SCALER_PATH")
if scaler_path and os.path.exists(scaler_path):
    scaler = joblib.load(scaler_path)

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
    
    # Format data for inference (Scikit-learn expects 2D array: [[val1, val2]])
    if isinstance(data, dict):
        # Handle single dictionary: {"feature1": 1, "feature2": 2} -> [[1, 2]]
        data = [list(data.values())]
    elif isinstance(data, list):
        if len(data) > 0 and isinstance(data[0], dict):
            # Handle list of dictionaries: [{"f1": 1}, {"f1": 2}] -> [[1], [2]]
            data = [list(item.values()) for item in data]
        elif len(data) > 0 and not isinstance(data[0], list):
            # If it's a list of strings (for NLP models), do NOT wrap it in a 2D array.
            if not isinstance(data[0], str):
                # Handle 1D list of numbers: [1, 2, 3] -> [[1, 2, 3]]
                data = [data]
            
    # Inference
    prediction = model.predict(data)
    
    # Postprocess
    if postprocess_func:
        prediction = postprocess_func(prediction)
    
    # Convert numpy array to list if needed
    if hasattr(prediction, "tolist"):
        prediction = prediction.tolist()
        
    # If postprocess returned a custom dictionary, return it directly
    if isinstance(prediction, dict):
        return prediction
        
    return {"prediction": prediction}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
