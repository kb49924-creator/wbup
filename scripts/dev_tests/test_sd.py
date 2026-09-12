import os
os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"
os.environ["HF_HUB_ENABLE_HF_TRANSFER"] = "0"
import torch
from diffusers import StableDiffusionControlNetImg2ImgPipeline, ControlNetModel, LCMScheduler
from PIL import Image
import numpy as np

print("Loading controlnet...")
controlnet = ControlNetModel.from_pretrained("lllyasviel/sd-controlnet-canny", torch_dtype=torch.float32)

print("Loading pipeline...")
pipe = StableDiffusionControlNetImg2ImgPipeline.from_pretrained(
    "runwayml/stable-diffusion-v1-5",
    controlnet=controlnet,
    torch_dtype=torch.float32,
    variant="fp16",
    safety_checker=None
)
pipe.load_lora_weights("latent-consistency/lcm-lora-sdv1-5")
pipe.scheduler = LCMScheduler.from_config(pipe.scheduler.config)

pipe.to("mps")
if hasattr(pipe, 'upcast_vae'):
    pipe.upcast_vae()
pipe.enable_attention_slicing()

print("Creating dummy images...")
init_image = Image.new("RGB", (512, 512), "white")
control_image = Image.new("RGB", (512, 512), "black")

print("Generating...")
result = pipe(
    prompt="a red apple on a white table",
    image=init_image,
    control_image=control_image,
    num_inference_steps=4,
    guidance_scale=1.5,
    controlnet_conditioning_scale=0.8,
    strength=0.85
).images[0]

result.save("test_out.png")
print("Saved. Extrema:", result.getextrema())
