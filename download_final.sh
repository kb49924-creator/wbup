#!/bin/bash
FILE="/Users/kirill1/.cache/huggingface/hub/models--runwayml--stable-diffusion-v1-5/snapshots/451f4fe16113bff5a5d2269ed5ad43b0592e9a14/unet/diffusion_pytorch_model.fp16.safetensors"
URL="https://huggingface.co/runwayml/stable-diffusion-v1-5/resolve/main/unet/diffusion_pytorch_model.fp16.safetensors"

echo "Starting robust direct download..."
while true; do
  curl -L -C - --speed-time 15 --speed-limit 1000 -o "$FILE" "$URL"
  if [ $? -eq 0 ]; then
    echo "Download completed successfully!"
    break
  fi
  echo "Retrying..."
  sleep 2
done
