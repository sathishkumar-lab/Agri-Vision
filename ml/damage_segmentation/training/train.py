"""Train a scratch-only candidate using a frozen real-world manifest."""
from __future__ import annotations
import argparse, csv, json, random, time
from pathlib import Path
import numpy as np
import tensorflow as tf
from ..config import CLASS_NAMES, DEFAULT_INPUT_SIZE, RANDOM_SEED
from ..data import dataset, load_manifest
from ..losses import LOSSES
from ..models import build_unet


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--manifest", required=True); p.add_argument("--output", required=True)
    p.add_argument("--architecture", choices=["unet", "residual_unet", "attention_unet", "mobilenet_unet"], default="unet")
    p.add_argument("--loss", choices=list(LOSSES), default="dice_cce")
    p.add_argument("--input-size", type=int, default=512); p.add_argument("--base-filters", type=int, default=32)
    p.add_argument("--batch-size", type=int, default=4); p.add_argument("--epochs", type=int, default=100); p.add_argument("--learning-rate", type=float, default=1e-3)
    a = p.parse_args(); out = Path(a.output); out.mkdir(parents=True, exist_ok=True)
    random.seed(RANDOM_SEED); np.random.seed(RANDOM_SEED); tf.keras.utils.set_random_seed(RANDOM_SEED)
    manifest = load_manifest(a.manifest)
    size = (a.input_size, a.input_size)
    train_ds = dataset(a.manifest, "train", a.batch_size, size, training=True)
    validation_ds = dataset(a.manifest, "validation", a.batch_size, size)
    model = build_unet((*size, 3), a.base_filters, variant=a.architecture)
    model.compile(optimizer=tf.keras.optimizers.Adam(a.learning_rate), loss=LOSSES[a.loss], metrics=["accuracy"])
    callbacks = [
        tf.keras.callbacks.ModelCheckpoint(out / "best.keras", monitor="val_loss", mode="min", save_best_only=True),
        tf.keras.callbacks.EarlyStopping(monitor="val_loss", mode="min", patience=15, restore_best_weights=True),
        tf.keras.callbacks.ReduceLROnPlateau(monitor="val_loss", mode="min", patience=6, factor=.5),
        tf.keras.callbacks.CSVLogger(out / "history.csv"),
    ]
    started = time.time(); history = model.fit(train_ds, validation_data=validation_ds, epochs=a.epochs, callbacks=callbacks)
    model.save(out / "final.keras")
    config = {"data_provenance": "real_world", "class_mapping": CLASS_NAMES, "input_size": list(size), "normalization": "rgb_float32_divide_255", "architecture": a.architecture, "loss": a.loss, "seed": RANDOM_SEED, "batch_size": a.batch_size, "learning_rate": a.learning_rate, "epochs_completed": len(history.history["loss"]), "parameters": model.count_params(), "training_seconds": round(time.time()-started, 2), "manifest": str(Path(a.manifest).resolve())}
    (out / "config.json").write_text(json.dumps(config, indent=2), encoding="utf-8")
    with (out / "experiment_results.csv").open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=config.keys()); writer.writeheader(); writer.writerow(config)

if __name__ == "__main__": main()
