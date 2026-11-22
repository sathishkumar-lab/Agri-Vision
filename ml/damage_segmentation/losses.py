"""Losses for class-imbalanced three-class segmentation."""
from __future__ import annotations
import tensorflow as tf


def dice_loss(y_true, y_pred, smooth=1.0):
    y_true = tf.cast(y_true, y_pred.dtype)
    axes = (0, 1, 2)
    numerator = 2.0 * tf.reduce_sum(y_true * y_pred, axis=axes) + smooth
    denominator = tf.reduce_sum(y_true + y_pred, axis=axes) + smooth
    return 1.0 - tf.reduce_mean(numerator / denominator)


def dice_cross_entropy(y_true, y_pred):
    cce = tf.reduce_mean(tf.keras.losses.categorical_crossentropy(y_true, y_pred))
    return cce + dice_loss(y_true, y_pred)


def focal_tversky_loss(y_true, y_pred, alpha=0.7, beta=0.3, gamma=1.33, smooth=1.0):
    y_true = tf.cast(y_true, y_pred.dtype)
    axes = (0, 1, 2)
    tp = tf.reduce_sum(y_true * y_pred, axis=axes)
    fp = tf.reduce_sum((1 - y_true) * y_pred, axis=axes)
    fn = tf.reduce_sum(y_true * (1 - y_pred), axis=axes)
    tversky = (tp + smooth) / (tp + alpha * fp + beta * fn + smooth)
    return tf.reduce_mean(tf.pow(1.0 - tversky, gamma))


def weighted_dice_cce(y_true, y_pred, weights=(1.0, 1.0, 5.0)):
    y_true = tf.cast(y_true, y_pred.dtype)
    weights_tensor = tf.constant(weights, dtype=y_pred.dtype)  # (3,)
    
    # Weighted categorical cross-entropy
    y_pred_clipped = tf.clip_by_value(y_pred, 1e-7, 1.0 - 1e-7)
    cce_per_pixel = -tf.reduce_sum(y_true * tf.math.log(y_pred_clipped) * weights_tensor, axis=-1)
    cce_loss = tf.reduce_mean(cce_per_pixel)
    
    # Per-class Dice with class weights
    axes = (0, 1, 2)
    tp = tf.reduce_sum(y_true * y_pred, axis=axes)
    denominator = tf.reduce_sum(y_true + y_pred, axis=axes)
    per_class_dice = (2.0 * tp + 1.0) / (denominator + 1.0)
    weighted_dice = tf.reduce_sum((1.0 - per_class_dice) * weights_tensor) / tf.reduce_sum(weights_tensor)
    
    return cce_loss + weighted_dice


def weighted_dice_cce_w5(y_true, y_pred):
    return weighted_dice_cce(y_true, y_pred, weights=(1.0, 1.0, 5.0))


def weighted_dice_cce_w10(y_true, y_pred):
    return weighted_dice_cce(y_true, y_pred, weights=(1.0, 1.0, 10.0))


LOSSES = {
    "cce": "categorical_crossentropy",
    "dice": dice_loss,
    "dice_cce": dice_cross_entropy,
    "focal_tversky": focal_tversky_loss,
    "weighted_dice_cce_w5": weighted_dice_cce_w5,
    "weighted_dice_cce_w10": weighted_dice_cce_w10
}
