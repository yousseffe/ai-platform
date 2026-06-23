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
    expected_api_key = os.getenv("API_KEY")
    if expected_api_key:
        auth_header = request.headers.get("Authorization")
        api_key = None
        if auth_header and auth_header.startswith("Bearer "):
            api_key = auth_header.split(" ")[1]
        else:
            api_key = request.headers.get("x-api-key")

        if api_key != expected_api_key:
            from fastapi import HTTPException
            raise HTTPException(status_code=401, detail="Unauthorized: Invalid API Key")

    data = await request.json()
    
    # Preprocess
    if preprocess_func:
        data = preprocess_func(data)
    
    # Format data for NLP inference (Expects 1D list of strings: ["text1", "text2"])
    if isinstance(data, dict):
        data = list(data.values())
    elif isinstance(data, list):
        if len(data) > 0 and isinstance(data[0], dict):
            # Extract first value from each dict
            data = [list(item.values())[0] for item in data]
        elif len(data) > 0 and isinstance(data[0], list):
            # Flatten 2D list to 1D
            data = [item[0] for item in data]
            
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
