"""Randomly initialized U-Net family. No application/pretrained encoder is used."""
from __future__ import annotations
import tensorflow as tf


def _conv(x, filters: int, name: str, residual: bool = False):
    shortcut = x
    x = tf.keras.layers.Conv2D(filters, 3, padding="same", kernel_initializer="he_normal", name=f"{name}_conv1")(x)
    x = tf.keras.layers.BatchNormalization(name=f"{name}_bn1")(x)
    x = tf.keras.layers.Activation("relu", name=f"{name}_relu1")(x)
    x = tf.keras.layers.Conv2D(filters, 3, padding="same", kernel_initializer="he_normal", name=f"{name}_conv2")(x)
    x = tf.keras.layers.BatchNormalization(name=f"{name}_bn2")(x)
    if residual:
        if shortcut.shape[-1] != filters:
            shortcut = tf.keras.layers.Conv2D(filters, 1, padding="same", kernel_initializer="he_normal", name=f"{name}_skip")(shortcut)
        x = tf.keras.layers.Add(name=f"{name}_add")([x, shortcut])
    return tf.keras.layers.Activation("relu", name=f"{name}_out")(x)


def _attention(skip, gate, filters: int, name: str):
    theta = tf.keras.layers.Conv2D(filters, 1, padding="same", name=f"{name}_theta")(skip)
    phi = tf.keras.layers.Conv2D(filters, 1, padding="same", name=f"{name}_phi")(gate)
    score = tf.keras.layers.Activation("relu")(tf.keras.layers.Add()([theta, phi]))
    alpha = tf.keras.layers.Activation("sigmoid", name=f"{name}_alpha")(tf.keras.layers.Conv2D(1, 1, padding="same")(score))
    return tf.keras.layers.Multiply(name=f"{name}_masked")([skip, alpha])


def build_mobilenet_unet(input_shape=(256, 256, 3)) -> tf.keras.Model:
    base = tf.keras.applications.MobileNetV2(input_shape=input_shape, include_top=False, weights="imagenet")
    inputs = base.input
    
    # Encoder skip connection layers
    skip_names = ["block_1_expand_relu", "block_3_expand_relu", "block_6_expand_relu", "block_13_expand_relu"]
    skips = [base.get_layer(name).output for name in skip_names]
    x = base.get_layer("out_relu").output
    
    decoder_filters = [256, 128, 64, 32]
    for i, filters in enumerate(decoder_filters):
        x = tf.keras.layers.Conv2DTranspose(filters, 2, strides=2, padding="same", kernel_initializer="he_normal", name=f"mob_up_{i}")(x)
        skip = skips[-(i+1)]
        x = tf.keras.layers.Concatenate(name=f"mob_concat_{i}")([x, skip])
        x = _conv(x, filters, f"mob_dec_{i}")
        
    x = tf.keras.layers.Conv2DTranspose(16, 2, strides=2, padding="same", kernel_initializer="he_normal", name="mob_final_up")(x)
    x = _conv(x, 16, "mob_final_dec")
    output = tf.keras.layers.Conv2D(3, 1, activation="softmax", name="segmentation")(x)
    return tf.keras.Model(inputs, output, name="mobilenet_unet")


def build_unet(input_shape=(512, 512, 3), base_filters: int = 32, depth: int = 4,
               variant: str = "unet") -> tf.keras.Model:
    """Build an untrained standard, residual, attention, or mobilenet U-Net."""
    if variant == "mobilenet_unet":
        return build_mobilenet_unet(input_shape)
    if variant not in {"unet", "residual_unet", "attention_unet"}:
        raise ValueError(f"Unknown scratch architecture: {variant}")
    inputs = tf.keras.Input(shape=input_shape, name="rgb_image")
    x, skips = inputs, []
    residual = variant == "residual_unet"
    for level in range(depth):
        filters = base_filters * (2 ** level)
        x = _conv(x, filters, f"encoder_{level}", residual)
        skips.append(x)
        x = tf.keras.layers.MaxPool2D(name=f"pool_{level}")(x)
    x = _conv(x, base_filters * (2 ** depth), "bottleneck", residual)
    for level in reversed(range(depth)):
        filters = base_filters * (2 ** level)
        x = tf.keras.layers.Conv2DTranspose(filters, 2, strides=2, padding="same", kernel_initializer="he_normal", name=f"up_{level}")(x)
        skip = skips[level]
        if variant == "attention_unet":
            skip = _attention(skip, x, filters, f"attention_{level}")
        x = tf.keras.layers.Concatenate(name=f"concat_{level}")([x, skip])
        x = _conv(x, filters, f"decoder_{level}", residual)
    output = tf.keras.layers.Conv2D(3, 1, activation="softmax", name="segmentation")(x)
    return tf.keras.Model(inputs, output, name=variant)

