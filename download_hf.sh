#!/bin/bash
FILE="/Users/kirill1/.cache/huggingface/hub/models--runwayml--stable-diffusion-v1-5/blobs/c83908253f9a64d08c25fc90874c9c8aef9a329ce1ca5fb909d73b0c83d1ea21.incomplete"
URL="https://huggingface.co/runwayml/stable-diffusion-v1-5/resolve/main/unet/diffusion_pytorch_model.fp16.safetensors"

echo "Starting robust download loop..."
while true; do
  # Download, continuing if possible (-C -).
  # If speed drops below 1000 bytes/sec for 15 seconds, abort and retry!
  curl -L -C - --speed-time 15 --speed-limit 1000 -o "$FILE" "$URL"
  
  # Exit code 0 means successful complete download.
  if [ $? -eq 0 ]; then
    echo "Download completed successfully!"
    break
  fi
  
  echo "Download interrupted or stalled. Retrying in 2 seconds..."
  sleep 2
done
