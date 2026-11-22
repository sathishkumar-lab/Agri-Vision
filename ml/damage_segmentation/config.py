"""Shared, immutable contract for real-world wheat damage segmentation."""
from __future__ import annotations

CLASS_NAMES = {0: "background", 1: "healthy_wheat_crop", 2: "damaged_wheat_crop"}
NUM_CLASSES = 3
DEFAULT_INPUT_SIZE = (512, 512)
NORMALIZATION = "rgb_float32_divide_255"
RANDOM_SEED = 2026

