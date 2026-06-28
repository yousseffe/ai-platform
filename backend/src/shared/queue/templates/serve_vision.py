from fastapi import FastAPI, Request
import os
import sys
import uvicorn
import importlib.util
import numpy as np

otel_available = False
if os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT"):
    try:
        from opentelemetry import trace
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        provider = TracerProvider()
        provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
        trace.set_tracer_provider(provider)
        otel_available = True
    except Exception as e:
        print(f"Warning: Failed to initialize OpenTelemetry trace provider: {e}")

app = FastAPI()

if os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT") and otel_available:
    try:
        FastAPIInstrumentor.instrument_app(app)
    except Exception as e:
        print(f"Warning: Failed to instrument FastAPI app with OpenTelemetry: {e}")

# Load preprocess if exists
preprocess_func = None
preprocess_module = None
preprocess_path = os.getenv("PREPROCESS_PATH")
if preprocess_path and os.path.exists(preprocess_path):
    try:
        spec = importlib.util.spec_from_file_location("preprocess", preprocess_path)
        preprocess_module = importlib.util.module_from_spec(spec)
        sys.modules["preprocess"] = preprocess_module
        spec.loader.exec_module(preprocess_module)
        if hasattr(preprocess_module, "preprocess"):
            preprocess_func = preprocess_module.preprocess
    except Exception as e:
        print(f"Warning: Failed to load preprocess script: {e}")

# Load postprocess if exists
postprocess_func = None
postprocess_module = None
postprocess_path = os.getenv("POSTPROCESS_PATH")
if postprocess_path and os.path.exists(postprocess_path):
    try:
        spec = importlib.util.spec_from_file_location("postprocess", postprocess_path)
        postprocess_module = importlib.util.module_from_spec(spec)
        sys.modules["postprocess"] = postprocess_module
        spec.loader.exec_module(postprocess_module)
        if hasattr(postprocess_module, "postprocess"):
            postprocess_func = postprocess_module.postprocess
    except Exception as e:
        print(f"Warning: Failed to load postprocess script: {e}")

# Load model
model_path = os.getenv("MODEL_PATH", "model.pkl")
framework = os.getenv("FRAMEWORK", "SKLEARN")
task_type = os.getenv("TASK_TYPE", "OTHER")

model = None
try:
    if framework == "SKLEARN" or framework == "CUSTOM":
        import joblib
        model = joblib.load(model_path)
    elif framework == "ONNX":
        import onnxruntime
        model = onnxruntime.InferenceSession(model_path)
    elif framework == "PYTORCH":
        import torch
        loaded = torch.load(model_path, map_location="cpu")
        if isinstance(loaded, dict) or type(loaded).__name__ == "OrderedDict":
            if preprocess_module and hasattr(preprocess_module, "load_model"):
                model = preprocess_module.load_model(model_path)
            else:
                import torchvision.models as models
                model_name = os.getenv("MODEL_NAME", "").lower() or os.path.basename(model_path).lower()
                model_instantiated = False
                
                if "mobilenet_v3" in model_name:
                    for arch in [models.mobilenet_v3_small, models.mobilenet_v3_large]:
                        try:
                            model = arch()
                            model.load_state_dict(loaded)
                            model_instantiated = True
                            break
                        except Exception:
                            continue
                elif "mobilenet_v2" in model_name:
                    try:
                        model = models.mobilenet_v2()
                        model.load_state_dict(loaded)
                        model_instantiated = True
                    except Exception:
                        pass
                elif "resnet50" in model_name:
                    try:
                        model = models.resnet50()
                        model.load_state_dict(loaded)
                        model_instantiated = True
                    except Exception:
                        pass
                elif "resnet18" in model_name:
                    try:
                        model = models.resnet18()
                        model.load_state_dict(loaded)
                        model_instantiated = True
                    except Exception:
                        pass
                elif "resnet34" in model_name:
                    try:
                        model = models.resnet34()
                        model.load_state_dict(loaded)
                        model_instantiated = True
                    except Exception:
                        pass
                elif "resnet101" in model_name:
                    try:
                        model = models.resnet101()
                        model.load_state_dict(loaded)
                        model_instantiated = True
                    except Exception:
                        pass
                
                if not model_instantiated:
                    raise ValueError(
                        f"Loaded object is a state_dict (OrderedDict). "
                        f"No matching architecture was auto-detected for name '{model_name}'. "
                        f"Please define a 'load_model' function in preprocess.py to instantiate the model."
                    )
        else:
            model = loaded
        model.eval()
    elif framework == "TENSORFLOW":
        import tensorflow as tf
        # Patch Keras 3.x Layer base class to accept and ignore quantization_config
        try:
            from keras.src.layers.layer import Layer as _KerasLayer
            _orig_layer_init = _KerasLayer.__init__
            def _patched_layer_init(self, *args, **kwargs):
                kwargs.pop("quantization_config", None)
                return _orig_layer_init(self, *args, **kwargs)
            _KerasLayer.__init__ = _patched_layer_init
        except Exception:
            pass
        try:
            model = tf.keras.models.load_model(model_path)
        except Exception:
            import joblib
            model = joblib.load(model_path)
except Exception as e:
    print(f"Error loading {framework} model from {model_path}: {e}")
    sys.exit(1)

# Load output schema for response formatting
from schema_utils import load_output_schema, apply_schema
output_schema = load_output_schema()


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
    
    # Preprocess must convert JSON to image array format (e.g. 3D/4D numpy array)
    if preprocess_func:
        data = preprocess_func(data)
    
    # Vision models expect a batch dimension (e.g., [batch, height, width, channels])
    if isinstance(data, list):
        data = np.array(data)
        
    # Inference
    try:
        prediction_proba = None
        
        if framework == "SKLEARN" or framework == "CUSTOM":
            prediction = model.predict(data)
            if task_type == "CLASSIFICATION" and hasattr(model, "predict_proba"):
                prediction_proba = model.predict_proba(data)
                
        elif framework == "ONNX":
            input_name = model.get_inputs()[0].name
            np_data = np.array(data).astype(np.float32)
            outputs = model.run(None, {input_name: np_data})
            prediction = outputs[0]
            if task_type == "CLASSIFICATION" and len(outputs) > 1:
                prediction_proba = outputs[1]
                
        elif framework == "PYTORCH":
            import torch
            tensor_data = torch.tensor(data, dtype=torch.float32)
            with torch.no_grad():
                prediction = model(tensor_data)
                if task_type == "CLASSIFICATION":
                    prediction_proba = torch.nn.functional.softmax(prediction, dim=1).numpy()
                    prediction = torch.argmax(prediction, dim=1).numpy()
                else:
                    prediction = prediction.numpy()
                    
        elif framework == "TENSORFLOW":
            np_data = np.array(data).astype(np.float32)
            prediction = model.predict(np_data)
            if task_type == "CLASSIFICATION":
                prediction_proba = prediction
                prediction = np.argmax(prediction, axis=1)
                
    except Exception as e:
        return {"error": str(e)}
    
    # Postprocess
    if postprocess_func:
        prediction = postprocess_func(prediction)
    
    if hasattr(prediction, "tolist"):
        prediction = prediction.tolist()
        
    if prediction_proba is not None and hasattr(prediction_proba, "tolist"):
        prediction_proba = prediction_proba.tolist()

    # Build default result
    if isinstance(prediction, dict):
        result = prediction
    else:
        result = {"prediction": prediction}
        
    if prediction_proba is not None and not postprocess_func:
        result["probabilities"] = prediction_proba

    # Apply output schema enforcement if defined
    schema_result = apply_schema(result, output_schema)
    if schema_result is not None:
        return schema_result

    return result

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
