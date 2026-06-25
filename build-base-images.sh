#!/usr/bin/env bash
set -e

echo "==================================================="
echo "Building AI Platform Docker Base Images"
echo "==================================================="

echo "[1/3] Building Sklearn Base Image..."
docker build -t ai-platform-sklearn-base:latest -f docker/base-images/sklearn-base.Dockerfile docker/base-images

echo "[2/3] Building PyTorch Base Image (CPU)..."
docker build -t ai-platform-pytorch-base:latest -f docker/base-images/pytorch-base.Dockerfile docker/base-images

echo "[3/3] Building Diffusion Base Image..."
docker build -t ai-platform-diffusion-base:latest -f docker/base-images/diffusion-base.Dockerfile docker/base-images

echo "==================================================="
echo "All base images built successfully!"
echo "==================================================="
