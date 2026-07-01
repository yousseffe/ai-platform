from fastapi import FastAPI, Request
import os
import sys
import uvicorn
import importlib.util
import inspect

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

# Detect how many positional args preprocess/postprocess expect
def _num_params(func):
    try:
        sig = inspect.signature(func)
        return sum(1 for p in sig.parameters.values()
                   if p.default is inspect.Parameter.empty
                   and p.kind in (inspect.Parameter.POSITIONAL_ONLY,
                                  inspect.Parameter.POSITIONAL_OR_KEYWORD))
    except (ValueError, TypeError):
        return 1

preprocess_nargs = _num_params(preprocess_func) if preprocess_func else 1
postprocess_nargs = _num_params(postprocess_func) if postprocess_func else 1

# If preprocess expects a 2nd arg (metadata), try to load it from the module
preprocess_metadata = None
if preprocess_func and preprocess_nargs >= 2 and preprocess_module:
    if hasattr(preprocess_module, "load_metadata"):
        try:
            preprocess_metadata = preprocess_module.load_metadata()
            print(f"Loaded preprocess metadata successfully.")
        except Exception as e:
            print(f"Warning: load_metadata() failed: {e}")

# Load model based on framework
model_path = os.getenv("MODEL_PATH", "model.pkl")
framework = os.getenv("FRAMEWORK", "SKLEARN")

model = None
try:
    if framework == "TENSORFLOW":
        import tensorflow as tf

        # Patch Keras 3.x Layer base class to accept and ignore quantization_config
        # This affects ALL layers (Dense, Embedding, LSTM, etc.) that have this
        # parameter in their serialized config but don't accept it in __init__
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
            # Fallback: model might be saved as a pickle via joblib
            import joblib
            model = joblib.load(model_path)
    elif framework == "PYTORCH":
        import torch
        loaded = torch.load(model_path, map_location="cpu")
        if isinstance(loaded, dict) or type(loaded).__name__ == "OrderedDict":
            if preprocess_module and hasattr(preprocess_module, "load_model"):
                model = preprocess_module.load_model(model_path)
            else:
                raise ValueError(
                    "Loaded object is a state_dict (OrderedDict). "
                    "Please define a 'load_model' function in preprocess.py "
                    "to instantiate your PyTorch model architecture and load the weights."
                )
        else:
            model = loaded
        model.eval()
    elif framework == "ONNX":
        import onnxruntime
        model = onnxruntime.InferenceSession(model_path)
    else:
        # SKLEARN, CUSTOM, or any other framework: use joblib
        import joblib
        model = joblib.load(model_path)
except Exception as e:
    print(f"Error loading {framework} model from {model_path}: {e}")
    sys.exit(1)

# Sync preprocess metadata max_len with the model's actual input shape
# This prevents mismatches where the metadata says max_len=100 but the model expects 200
if preprocess_metadata and model is not None:
    try:
        raw_shape = getattr(model, "input_shape", None)
        if isinstance(raw_shape, list):
            raw_shape = raw_shape[0]
        if raw_shape and len(raw_shape) == 2 and raw_shape[1] is not None:
            model_max_len = raw_shape[1]
            meta_max_len = preprocess_metadata.get("max_len")
            if meta_max_len and meta_max_len != model_max_len:
                print(f"[serve_nlp] Overriding metadata max_len={meta_max_len} -> {model_max_len} to match model input shape", flush=True)
                preprocess_metadata["max_len"] = model_max_len
    except Exception as e:
        print(f"[serve_nlp] Could not sync max_len: {e}", flush=True)

# Helper to convert dataclass / arbitrary objects to JSON-safe dicts
def _to_serializable(obj):
    import dataclasses
    if dataclasses.is_dataclass(obj) and not isinstance(obj, type):
        return dataclasses.asdict(obj)
    if isinstance(obj, list):
        return [_to_serializable(item) for item in obj]
    if hasattr(obj, "tolist"):
        return obj.tolist()
    return obj

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

    # Keep a copy of the raw input for postprocess scripts that need original text
    raw_input = data

    # Extract text from dict input (e.g. {"text": "..."})
    if isinstance(data, dict):
        text_values = list(data.values())
        # If single text value, unwrap it
        if len(text_values) == 1 and isinstance(text_values[0], str):
            raw_text = text_values[0]
        else:
            raw_text = text_values
    elif isinstance(data, str):
        raw_text = data
    elif isinstance(data, list):
        raw_text = data
    else:
        raw_text = data

    # Preprocess
    if preprocess_func:
        if preprocess_nargs >= 2 and preprocess_metadata is not None:
            data = preprocess_func(raw_text, preprocess_metadata)
        else:
            try:
                data = preprocess_func(data)
            except (TypeError, AttributeError, KeyError, ValueError):
                # Fallback: try passing just the extracted text.
                # Only fall back to raw_text when it is actually a string;
                # if raw_text is a list (e.g. multi-field dict or wrong input
                # shape), extract the first string element instead so we don't
                # forward an unintended list to a function expecting a string.
                if isinstance(raw_text, str):
                    data = preprocess_func(raw_text)
                elif isinstance(raw_text, list):
                    first_str = next((v for v in raw_text if isinstance(v, str)), None)
                    if first_str is not None:
                        data = preprocess_func(first_str)
                    else:
                        data = preprocess_func(raw_text)
                else:
                    data = preprocess_func(raw_text)
    else:
        # Default NLP formatting: expects 1D list of strings
        if isinstance(data, dict):
            data = list(data.values())
        elif isinstance(data, list):
            if len(data) > 0 and isinstance(data[0], dict):
                data = [list(item.values())[0] for item in data]
            elif len(data) > 0 and isinstance(data[0], list):
                data = [item[0] for item in data]

    # Inference
    try:
        if framework == "TENSORFLOW":
            import numpy as np
            if not isinstance(data, np.ndarray):
                np_data = np.array(data)
            else:
                np_data = data

            # Reconcile sequence length with model's expected input shape
            try:
                raw_shape = model.input_shape  # (None, 200) or [(None, 200)]
                # Functional models may wrap shape in a list
                if isinstance(raw_shape, list):
                    raw_shape = raw_shape[0]
                print(f"[serve_nlp] Model input_shape: {raw_shape}, data shape: {np_data.shape}", flush=True)
                if raw_shape and len(raw_shape) == 2 and raw_shape[1] is not None:
                    expected_len = raw_shape[1]
                    if np_data.ndim == 2 and np_data.shape[1] != expected_len:
                        actual_len = np_data.shape[1]
                        print(f"[serve_nlp] Reconciling: {actual_len} -> {expected_len}", flush=True)
                        if actual_len < expected_len:
                            # Left-pad with zeros to match expected length
                            padding = np.zeros((np_data.shape[0], expected_len - actual_len), dtype=np_data.dtype)
                            np_data = np.concatenate([padding, np_data], axis=1)
                        else:
                            # Truncate from the left (keep most recent tokens)
                            np_data = np_data[:, actual_len - expected_len:]
                        print(f"[serve_nlp] Reconciled shape: {np_data.shape}", flush=True)
            except Exception as shape_err:
                print(f"[serve_nlp] Shape reconciliation failed: {shape_err}", flush=True)

            # Clamp token indices to the embedding vocabulary size
            # The preprocessing vocab may be larger than the model's embedding input_dim
            try:
                for layer in model.layers:
                    if "embedding" in layer.__class__.__name__.lower():
                        vocab_size = layer.input_dim
                        oov_idx = 2  # standard OOV token index
                        oob_count = int(np.sum(np_data >= vocab_size))
                        if oob_count > 0:
                            print(f"[serve_nlp] Clamping {oob_count} tokens exceeding vocab_size={vocab_size} to OOV={oov_idx}", flush=True)
                            np_data = np.where(np_data >= vocab_size, oov_idx, np_data)
                        break
            except Exception as clamp_err:
                print(f"[serve_nlp] Vocab clamping failed: {clamp_err}", flush=True)

            prediction = model.predict(np_data)
        elif framework == "PYTORCH":
            import torch
            tensor_data = torch.tensor(data, dtype=torch.float32)
            with torch.no_grad():
                prediction = model(tensor_data)
                prediction = prediction.numpy()
        elif framework == "ONNX":
            import numpy as np
            input_name = model.get_inputs()[0].name
            np_data = np.array(data)
            outputs = model.run(None, {input_name: np_data})
            prediction = outputs[0]
        else:
            prediction = model.predict(data)
    except Exception as e:
        return {"error": str(e)}

    # Postprocess
    print(f"[serve_nlp] postprocess_func={postprocess_func}, postprocess_nargs={postprocess_nargs}", flush=True)
    if postprocess_func:
        try:
            if postprocess_nargs >= 2:
                # Postprocess expects (original_text, prediction_scores)
                scores = prediction.flatten() if hasattr(prediction, "flatten") else prediction
                print(f"[serve_nlp] Calling postprocess(raw_text={type(raw_text)}, scores={scores})", flush=True)
                prediction = postprocess_func(raw_text, scores)
            else:
                prediction = postprocess_func(prediction)
            print(f"[serve_nlp] Postprocess result type: {type(prediction)}", flush=True)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {"error": f"Postprocess failed: {str(e)}"}

    # Serialize the result
    prediction = _to_serializable(prediction)

    # Apply output schema enforcement if defined
    schema_result = apply_schema(prediction, output_schema)
    if schema_result is not None:
        return schema_result

    # Fallback: no schema defined — return raw prediction
    return prediction

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
