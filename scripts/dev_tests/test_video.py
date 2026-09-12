#!/usr/bin/env python3
"""Test: WB UP Case Video Generator v3."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.video.video_maker import CaseVideoMaker

base = os.path.dirname(os.path.abspath(__file__))

maker = CaseVideoMaker(os.path.join(base, "data", "video_assets"))
maker.render(
    product_path=os.path.join(base, "data", "images", "no_bg", "404416099_idx1_23_big.png"),
    product_name="ФУТБОЛКА OVERSIZE",
    price="1 990 ₽",
    brand="WB UP",
    output_path=os.path.join(base, "output_tiktok_v3.mp4"),
)
