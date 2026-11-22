"""Real-world three-class wheat damage inference service.

The former synthetic-trained binary Stage 2 checkpoint is intentionally not loaded.
This service becomes available only after a validated scratch-trained model is deployed.
"""
import sys
from pathlib import Path

BACKEND_FOLDER = Path(__file__).resolve().parents[2]
WORKSPACE_ROOT = BACKEND_FOLDER.parent
if str(WORKSPACE_ROOT) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_ROOT))

import numpy as np
from PIL import Image
from ml.damage_segmentation.inference import DamageSegmenter

BACKEND_FOLDER = Path(__file__).resolve().parents[2]
MODEL_PATH = BACKEND_FOLDER.parent / "ml" / "damage_segmentation" / "models" / "production" / "best.keras"
CONFIG_PATH = MODEL_PATH.parent / "config.json"
MASK_DIR = BACKEND_FOLDER / "damage_results" / "masks"
OVERLAY_DIR = BACKEND_FOLDER / "damage_results" / "overlays"
MASK_DIR.mkdir(parents=True, exist_ok=True)
OVERLAY_DIR.mkdir(parents=True, exist_ok=True)
_segmenter = None


def _model():
    global _segmenter
    if _segmenter is None:
        if not MODEL_PATH.exists() or not CONFIG_PATH.exists():
            raise FileNotFoundError(
                "No validated real-world three-class damage model is deployed. "
                "Train and evaluate a scratch model, then deploy best.keras and config.json "
                "to ml/damage_segmentation/models/production/."
            )
        _segmenter = DamageSegmenter(MODEL_PATH, CONFIG_PATH)
    return _segmenter


def predict_damage(image_path: str, output_name: str | None = None):
    """Segment 0/background, 1/healthy, and 2/damaged crop and calculate crop-only damage."""
    rgb, mask, counts = _model().predict(image_path)
    stem = Path(output_name or image_path).stem
    mask_name, overlay_name = f"{stem}_damage_mask.png", f"{stem}_damage_overlay.jpg"
    palette = np.array([[0, 0, 0], [30, 170, 50], [220, 40, 35]], dtype=np.uint8)
    color_mask = palette[mask]
    Image.fromarray(color_mask).save(MASK_DIR / mask_name)
    overlay = (.55 * rgb + .45 * color_mask).astype(np.uint8)
    Image.fromarray(overlay).save(OVERLAY_DIR / overlay_name, quality=90)
    
    total_img_px = counts["total_image_pixels"]
    class_distribution = {
        "background": {
            "pixel_count": counts["background_pixels"],
            "percentage": round(100.0 * counts["background_pixels"] / total_img_px, 4) if total_img_px > 0 else 0.0,
        },
        "healthy_wheat": {
            "pixel_count": counts["healthy_crop_pixels"],
            "percentage": round(100.0 * counts["healthy_crop_pixels"] / total_img_px, 4) if total_img_px > 0 else 0.0,
        },
        "damaged_wheat": {
            "pixel_count": counts["damaged_crop_pixels"],
            "percentage": round(100.0 * counts["damaged_crop_pixels"] / total_img_px, 4) if total_img_px > 0 else 0.0,
        }
    }

    return {
        **counts,
        "damaged_pixels": counts["damaged_crop_pixels"],
        "total_pixels": counts["total_image_pixels"],
        "threshold": None,
        "image_width": int(rgb.shape[1]), "image_height": int(rgb.shape[0]),
        "model": "residual_unet", "model_checkpoint": str(MODEL_PATH),
        "mask_filename": mask_name, "overlay_filename": overlay_name,
        "mask_path": str(MASK_DIR / mask_name), "overlay_path": str(OVERLAY_DIR / overlay_name),
        "class_distribution": class_distribution,
        "mask": mask,
    }

