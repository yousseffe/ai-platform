from fastapi import FastAPI, Request, HTTPException
import os
import uvicorn
import io
import base64
import torch
from diffusers import StableDiffusionPipeline

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

# Load model
model_path = os.getenv("MODEL_PATH", "model.pkl")
pipeline = None

try:
    print(f"Loading Stable Diffusion pipeline from {model_path}...")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Using device: {device}")
    
    # Load pipeline
    pipeline = StableDiffusionPipeline.from_pretrained(model_path, local_files_only=True)
    pipeline = pipeline.to(device)
    print("Stable Diffusion pipeline loaded successfully.")
except Exception as e:
    print(f"Error loading Stable Diffusion pipeline from {model_path}: {e}")
    import sys
    sys.exit(1)

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

    if pipeline is None:
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
        # Run inference
        with torch.no_grad():
            output = pipeline(
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
