FROM ai-platform-pytorch-base:latest
RUN pip install --no-cache-dir diffusers transformers accelerate protobuf
