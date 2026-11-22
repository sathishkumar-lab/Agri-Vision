"""Paired real-data loaders. Masks are never normalized and always nearest-resized."""
from __future__ import annotations
import json
from pathlib import Path
import tensorflow as tf
from .config import DEFAULT_INPUT_SIZE, NUM_CLASSES


def load_manifest(path: str | Path) -> dict:
    manifest = json.loads(Path(path).read_text(encoding="utf-8"))
    if manifest.get("data_provenance") != "real_world":
        raise ValueError("Manifest is not explicitly declared real_world; refusing to train or evaluate.")
    return manifest


def _read(image_path, mask_path, size):
    image = tf.io.decode_image(tf.io.read_file(image_path), channels=3, expand_animations=False)
    image.set_shape([None, None, 3])
    image = tf.image.resize(image, size, method="bilinear")
    image = tf.cast(image, tf.float32) / 255.0
    mask = tf.io.decode_image(tf.io.read_file(mask_path), channels=1, expand_animations=False)
    mask.set_shape([None, None, 1])
    mask = tf.image.resize(mask, size, method="nearest")
    mask = tf.cast(tf.squeeze(mask, axis=-1), tf.int32)
    tf.debugging.assert_greater_equal(mask, 0)
    tf.debugging.assert_less(mask, NUM_CLASSES)
    return image, tf.one_hot(mask, NUM_CLASSES)


def _augment(image, mask):
    # Geometric changes are applied jointly; photometric changes affect RGB only.
    if tf.random.uniform(()) > .5:
        image, mask = tf.image.flip_left_right(image), tf.image.flip_left_right(mask)
    image = tf.image.random_brightness(image, .08)
    image = tf.image.random_contrast(image, .9, 1.1)
    image = tf.clip_by_value(image, 0., 1.)
    return image, mask


def dataset(manifest_path, split: str, batch_size: int, input_size=DEFAULT_INPUT_SIZE, training=False):
    entries = [e for e in load_manifest(manifest_path)["entries"] if e["split"] == split]
    if not entries:
        raise ValueError(f"Manifest contains no {split} examples.")
    ds = tf.data.Dataset.from_tensor_slices(([e["image"] for e in entries], [e["mask"] for e in entries]))
    if training: ds = ds.shuffle(len(entries), seed=2026, reshuffle_each_iteration=True)
    ds = ds.map(lambda i, m: _read(i, m, input_size), num_parallel_calls=tf.data.AUTOTUNE)
    if training: ds = ds.map(_augment, num_parallel_calls=tf.data.AUTOTUNE)
    return ds.batch(batch_size).prefetch(tf.data.AUTOTUNE)
