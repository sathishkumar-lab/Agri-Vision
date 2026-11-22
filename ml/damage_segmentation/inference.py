"""Inference that exactly mirrors training RGB resize/normalization and three-class output."""
from __future__ import annotations
import json
from pathlib import Path
import numpy as np
import tensorflow as tf
from PIL import Image


class DamageSegmenter:
    def __init__(self, model_path: str | Path, config_path: str | Path):
        self.config=json.loads(Path(config_path).read_text(encoding="utf-8"))
        mapping=self.config.get("class_mapping", {})
        if self.config.get("data_provenance") != "real_world" or mapping.get("2", mapping.get(2)) != "damaged_wheat_crop":
            raise ValueError("Deployment config is not a valid real-world three-class damage model.")
        self.size=tuple(self.config["input_size"]); self.model=tf.keras.models.load_model(model_path,compile=False)
        if self.model.output_shape[-1] != 3: raise ValueError("Damage model must output 3 softmax classes.")

    def predict(self, image_path: str | Path):
        with Image.open(image_path) as im: rgb=np.asarray(im.convert("RGB")); original=im.size
        resized=np.asarray(Image.fromarray(rgb).resize(self.size, Image.Resampling.BILINEAR),np.float32)/255.
        small=np.argmax(self.model.predict(resized[None],verbose=0)[0],axis=-1).astype(np.uint8)
        mask=np.asarray(Image.fromarray(small).resize(original,Image.Resampling.NEAREST),np.uint8)
        counts={"background_pixels":int((mask==0).sum()),"healthy_crop_pixels":int((mask==1).sum()),"damaged_crop_pixels":int((mask==2).sum())}; counts["total_crop_pixels"]=counts["healthy_crop_pixels"]+counts["damaged_crop_pixels"]
        counts["total_image_pixels"]=int(mask.size); counts["damage_percentage"]=100*counts["damaged_crop_pixels"]/counts["total_crop_pixels"] if counts["total_crop_pixels"] else 0.
        return rgb,mask,counts
