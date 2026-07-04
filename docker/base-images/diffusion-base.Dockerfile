FROM ai-platform-pytorch-base:latest
RUN --mount=type=cache,target=/root/.cache/pip pip install diffusers transformers accelerate protobuf
