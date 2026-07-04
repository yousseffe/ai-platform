from fastapi import FastAPI, Request, HTTPException
import os
import uvicorn
import io
import base64
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

# C3: Lazy framework import / pipeline load. Importing torch + diffusers and
# loading a Stable Diffusion pipeline is the single largest chunk of
# "warm-up" time in the whole platform (often 30-60s). Previously this ran
# at module import time, before uvicorn could bind, so the deploy
# health-check loop had no choice but to wait out the entire load. Now the
# import + pipeline load is deferred to the first /predict call and cached
# in _pipeline, so /health can return 200 immediately and the deployment is
# marked RUNNING far sooner. Trade-off: the first prediction after deploy
# pays the full pipeline-load cost inline; subsequent predictions reuse the
# cached pipeline.
model_path = os.getenv("MODEL_PATH", "model.pkl")

_pipeline = None
_pipeline_lock = threading.Lock()
_pipeline_load_error = None


def _load_pipeline():
    """Loads (and caches) the Stable Diffusion pipeline on first use.
    Thread-safe via _pipeline_lock."""
    global _pipeline, _pipeline_load_error
    if _pipeline is not None or _pipeline_load_error is not None:
        return
    with _pipeline_lock:
        if _pipeline is not None or _pipeline_load_error is not None:
            return
        try:
            import torch
            from diffusers import StableDiffusionPipeline

            print(f"Loading Stable Diffusion pipeline from {model_path}...")
            device = "cuda" if torch.cuda.is_available() else "cpu"
            print(f"Using device: {device}")

            pipeline = StableDiffusionPipeline.from_pretrained(model_path, local_files_only=True)
            if device == "cpu":
                pipeline = pipeline.to(torch.float32)
            pipeline = pipeline.to(device)
            _pipeline = pipeline
            print("Stable Diffusion pipeline loaded successfully.")
        except Exception as e:
            _pipeline_load_error = str(e)
            print(f"Error loading Stable Diffusion pipeline from {model_path}: {e}")


@app.get("/health")
async def health():
    # Process liveness only — not gated on pipeline load. See C3 comment above.
    return {"status": "ok"}


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
            raise HTTPException(status_code=401, detail="Unauthorized: Invalid API Key")

    _load_pipeline()
    if _pipeline_load_error is not None:
        raise HTTPException(status_code=500, detail=f"Stable Diffusion pipeline failed to load: {_pipeline_load_error}")
    if _pipeline is None:
        raise HTTPException(status_code=500, detail="Stable Diffusion pipeline is not loaded.")

    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload.")

    prompt = data.get("prompt")
    if not prompt:
        raise HTTPException(status_code=400, detail="Missing required 'prompt' parameter.")

    # Parse parameters
    num_inference_steps = data.get("num_inference_steps", 10)
    guidance_scale = data.get("guidance_scale", 7.5)

    try:
        import torch

        # Run inference
        with torch.no_grad():
            output = _pipeline(
                prompt=prompt,
                num_inference_steps=num_inference_steps,
                guidance_scale=guidance_scale
            )
            image = output.images[0]

        # Convert image to Base64 PNG string
        buffered = io.BytesIO()
        image.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")

        return {"image": img_str}
    except Exception as e:
        print(f"Error during Stable Diffusion inference: {e}")
        raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
