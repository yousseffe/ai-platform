from fastapi import FastAPI, Request
import os
import sys
import uvicorn
import importlib.util
import threading

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

# Load scaler if exists
scaler = None
scaler_path = os.getenv("SCALER_PATH")
if scaler_path and os.path.exists(scaler_path):
    try:
        import joblib
        scaler = joblib.load(scaler_path)
    except Exception as e:
        print(f"Warning: Failed to load scaler from {scaler_path}: {e}")

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

# C3: Lazy framework import / model load. Importing torch/tensorflow and
# loading the model weights is the dominant chunk of container "warm-up"
# time (several seconds for PyTorch, longer for TensorFlow). Instead of
# doing this at module import time (which blocks uvicorn from binding and
# therefore blocks the deploy health check from ever passing until the
# model finishes loading), we defer it to the first /predict request and
# cache the result in _model. This trades first-request latency for much
# faster deploy-readiness — the health check can pass as soon as the
# process is up, and B4's health-check backoff no longer has to wait out
# the full framework import.
model_path = os.getenv("MODEL_PATH", "model.pkl")
framework = os.getenv("FRAMEWORK", "SKLEARN")
task_type = os.getenv("TASK_TYPE", "OTHER")

_model = None
_model_lock = threading.Lock()
_model_load_error = None


def _load_model():
    """Loads (and caches) the model on first use. Thread-safe via _model_lock."""
    global _model, _model_load_error
    if _model is not None or _model_load_error is not None:
        return
    with _model_lock:
        if _model is not None or _model_load_error is not None:
            return
        try:
            if framework == "SKLEARN" or framework == "CUSTOM":
                import joblib
                _model = joblib.load(model_path)
            elif framework == "ONNX":
                import onnxruntime
                _model = onnxruntime.InferenceSession(model_path)
            elif framework == "PYTORCH":
                import torch
                loaded = torch.load(model_path, map_location="cpu")
                if isinstance(loaded, dict) or type(loaded).__name__ == "OrderedDict":
                    if preprocess_module and hasattr(preprocess_module, "load_model"):
                        _model = preprocess_module.load_model(model_path)
                    else:
                        raise ValueError("Loaded object is a state_dict (OrderedDict). Please define a 'load_model' function in preprocess.py to instantiate your PyTorch model architecture and load the weights.")
                else:
                    _model = loaded
                _model.eval()
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
                    _model = tf.keras.models.load_model(model_path)
                except Exception:
                    import joblib
                    _model = joblib.load(model_path)
        except Exception as e:
            _model_load_error = str(e)
            print(f"Error loading {framework} model from {model_path}: {e}")


@app.get("/health")
async def health():
    # Health reflects process liveness only, not model-load state, so the
    # deploy health-check loop can flip the deployment to RUNNING as soon as
    # uvicorn is bound — see C3 comment above.
    return {"status": "ok"}


@app.post("/predict")
async def predict(request: Request):
    try:
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

        _load_model()
        if _model_load_error is not None:
            return {"error": f"Model failed to load: {_model_load_error}"}
        model = _model

        data = await request.json()

        # Backwards compatibility for older auto-detected samples:
        # {"feature_0": 1, "feature_1": 2} -> {"features": [1, 2]}
        if isinstance(data, dict) and "features" not in data:
            feature_items = []
            for key, value in data.items():
                if isinstance(key, str) and key.startswith("feature_"):
                    suffix = key.replace("feature_", "", 1)
                    if suffix.isdigit():
                        feature_items.append((int(suffix), value))
            if feature_items and len(feature_items) == len(data):
                data = {"features": [value for _, value in sorted(feature_items)]}

        # Preprocess
        if preprocess_func:
            data = preprocess_func(data)
        elif scaler:
            pass
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}

    # Format data for TABULAR inference.
    # Sklearn numeric models expect shape (1, n_features): [[v1, v2, ...]].
    # Sklearn text pipelines (TF-IDF, CountVectorizer, etc.) expect a 1-D
    # iterable of strings and break if wrapped in an extra list.
    if isinstance(data, dict):
        values = list(data.values())
        if not values:
            data = [values]
        elif isinstance(values[0], (list, tuple)):
            # Value is already a feature vector: {"features": [1,2,3]} → [[1,2,3]]
            data = values
        elif any(isinstance(v, str) for v in values):
            # Text / categorical field(s) — keep as 1-D for text pipelines
            data = values
        else:
            # Pure numeric features — wrap into 2-D array: [[val1, val2, ...]]
            data = [values]
    elif isinstance(data, list):
        if len(data) > 0 and isinstance(data[0], dict):
            data = [list(item.values()) for item in data]
        elif len(data) > 0 and not isinstance(data[0], list):
            # Always wrap 1D list in a 2D array for tabular models
            data = [data]

    # Inference
    try:
        prediction_proba = None

        if framework == "SKLEARN" or framework == "CUSTOM":
            prediction = model.predict(data)

            # If it's a classification task, we can also try to return probabilities
            if task_type == "CLASSIFICATION" and hasattr(model, "predict_proba"):
                prediction_proba = model.predict_proba(data)

        elif framework == "ONNX":
            import numpy as np
            input_name = model.get_inputs()[0].name
            # convert data to numpy float32 array
            np_data = np.array(data).astype(np.float32)
            outputs = model.run(None, {input_name: np_data})
            prediction = outputs[0]
            # ONNX usually returns probabilities as the second output for classification
            if task_type == "CLASSIFICATION" and len(outputs) > 1:
                prediction_proba = outputs[1]

        elif framework == "PYTORCH":
            import torch
            tensor_data = torch.tensor(data, dtype=torch.float32)
            with torch.no_grad():
                prediction = model(tensor_data)

                # For classification, PyTorch models usually output logits. Apply softmax.
                if task_type == "CLASSIFICATION":
                    prediction_proba = torch.nn.functional.softmax(prediction, dim=1).numpy()
                    prediction = torch.argmax(prediction, dim=1).numpy()
                else:
                    prediction = prediction.numpy()

        elif framework == "TENSORFLOW":
            import numpy as np
            np_data = np.array(data).astype(np.float32)
            prediction = model.predict(np_data)

            # TF usually outputs probabilities for classification
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

    return result

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
