FROM ai-platform-sklearn-base:latest
RUN --mount=type=cache,target=/root/.cache/pip pip install tensorflow
