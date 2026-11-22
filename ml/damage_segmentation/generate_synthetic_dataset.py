from pathlib import Path
import csv
import random

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


# --------------------------------------------------
# Configuration
# --------------------------------------------------

IMAGE_SIZE = 512
NUMBER_OF_IMAGES = 50
SEED = 42

random.seed(SEED)
np.random.seed(SEED)

BASE_DIR = Path(__file__).resolve().parent
DATASET_DIR = BASE_DIR / "synthetic_dataset"

IMAGES_DIR = DATASET_DIR / "images"
MASKS_DIR = DATASET_DIR / "masks"
PREVIEWS_DIR = DATASET_DIR / "previews"

IMAGES_DIR.mkdir(parents=True, exist_ok=True)
MASKS_DIR.mkdir(parents=True, exist_ok=True)
PREVIEWS_DIR.mkdir(parents=True, exist_ok=True)

METADATA_FILE = DATASET_DIR / "metadata.csv"


# --------------------------------------------------
# Helper functions
# --------------------------------------------------

def random_green():
    return (
        random.randint(35, 90),
        random.randint(100, 165),
        random.randint(30, 85),
    )


def random_damaged_color():
    colors = [
        (181, 145, 58),
        (194, 160, 67),
        (155, 112, 48),
        (173, 125, 54),
        (205, 180, 86),
        (135, 92, 40),
    ]
    return random.choice(colors)


def create_background():
    """
    Creates soil + sky background.
    """
    image = Image.new(
        "RGB",
        (IMAGE_SIZE, IMAGE_SIZE),
        (145, 185, 215),
    )

    draw = ImageDraw.Draw(image)

    horizon = random.randint(90, 150)

    # Sky
    draw.rectangle(
        [0, 0, IMAGE_SIZE, horizon],
        fill=(
            random.randint(150, 190),
            random.randint(185, 215),
            random.randint(215, 240),
        ),
    )

    # Soil
    draw.rectangle(
        [0, horizon, IMAGE_SIZE, IMAGE_SIZE],
        fill=(
            random.randint(90, 125),
            random.randint(65, 95),
            random.randint(35, 65),
        ),
    )

    return image, horizon


def draw_crop_patch(
    image_draw,
    mask_draw,
    patch_box,
    damaged=False,
):
    """
    Draws many wheat-like lines/stalks inside a region.
    """

    x1, y1, x2, y2 = patch_box

    crop_class = 2 if damaged else 1

    mask_draw.rectangle(
        patch_box,
        fill=crop_class,
    )

    stalk_count = random.randint(120, 220)

    for _ in range(stalk_count):
        x = random.randint(x1, x2)
        base_y = random.randint(max(y1 + 25, y1), y2)

        stalk_height = random.randint(25, 90)
        top_y = max(y1, base_y - stalk_height)

        if damaged:
            color = random_damaged_color()
        else:
            color = random_green()

        width = random.randint(2, 5)

        image_draw.line(
            [(x, base_y), (x + random.randint(-8, 8), top_y)],
            fill=color,
            width=width,
        )

        # Wheat head
        head_x = x + random.randint(-8, 8)

        image_draw.ellipse(
            [
                head_x - 3,
                top_y - 6,
                head_x + 4,
                top_y + 8,
            ],
            fill=color,
        )


def make_overlay(image, mask):
    """
    Creates an easy-to-view colored preview.

    Green  = healthy
    Red    = damaged
    """
    image_array = np.array(image).astype(np.float32)
    mask_array = np.array(mask)

    overlay = image_array.copy()

    healthy = mask_array == 1
    damaged = mask_array == 2

    green = np.array([0, 255, 0])
    red = np.array([255, 0, 0])

    alpha = 0.35

    overlay[healthy] = (
        image_array[healthy] * (1 - alpha)
        + green * alpha
    )

    overlay[damaged] = (
        image_array[damaged] * (1 - alpha)
        + red * alpha
    )

    overlay = np.clip(
        overlay,
        0,
        255,
    ).astype(np.uint8)

    return Image.fromarray(overlay)


def create_sample(index):
    image, horizon = create_background()

    # IMPORTANT:
    # L-mode mask stores integer class IDs:
    # 0 background
    # 1 healthy
    # 2 damaged
    mask = Image.new(
        "L",
        (IMAGE_SIZE, IMAGE_SIZE),
        0,
    )

    image_draw = ImageDraw.Draw(image)
    mask_draw = ImageDraw.Draw(mask)

    # Random desired damage level
    target_damage = random.uniform(0.0, 0.70)

    crop_top = horizon + random.randint(5, 30)
    crop_bottom = IMAGE_SIZE - random.randint(5, 20)

    # Whole crop area
    full_crop_box = (
        0,
        crop_top,
        IMAGE_SIZE - 1,
        crop_bottom,
    )

    # First make crop healthy
    draw_crop_patch(
        image_draw,
        mask_draw,
        full_crop_box,
        damaged=False,
    )

    # Create damaged patches
    patch_count = random.randint(1, 5)

    for _ in range(patch_count):

        if target_damage < 0.05:
            break

        patch_width = random.randint(70, 220)
        patch_height = random.randint(70, 190)

        x1 = random.randint(
            0,
            max(0, IMAGE_SIZE - patch_width),
        )

        y1 = random.randint(
            crop_top,
            max(crop_top, crop_bottom - patch_height),
        )

        x2 = min(
            IMAGE_SIZE - 1,
            x1 + patch_width,
        )

        y2 = min(
            crop_bottom,
            y1 + patch_height,
        )

        # Scale patch probability using target damage
        if random.random() <= target_damage + 0.25:
            draw_crop_patch(
                image_draw,
                mask_draw,
                (x1, y1, x2, y2),
                damaged=True,
            )

    # Add slight blur to make the RGB image less artificial
    image = image.filter(
        ImageFilter.GaussianBlur(
            radius=random.uniform(0.2, 0.8)
        )
    )

    mask_array = np.array(mask)

    healthy_pixels = int(
        np.sum(mask_array == 1)
    )

    damaged_pixels = int(
        np.sum(mask_array == 2)
    )

    crop_pixels = (
        healthy_pixels
        + damaged_pixels
    )

    if crop_pixels > 0:
        damage_percentage = (
            damaged_pixels
            / crop_pixels
        ) * 100
    else:
        damage_percentage = 0.0

    if damage_percentage <= 10:
        severity = "low"
    elif damage_percentage <= 30:
        severity = "moderate"
    elif damage_percentage <= 60:
        severity = "high"
    else:
        severity = "severe"

    filename = f"synthetic_{index:03d}.png"

    image.save(
        IMAGES_DIR / filename
    )

    mask.save(
        MASKS_DIR / filename
    )

    overlay = make_overlay(
        image,
        mask,
    )

    overlay.save(
        PREVIEWS_DIR / filename
    )

    return {
        "filename": filename,
        "healthy_pixels": healthy_pixels,
        "damaged_pixels": damaged_pixels,
        "crop_pixels": crop_pixels,
        "damage_percentage": round(
            damage_percentage,
            2,
        ),
        "severity": severity,
    }


# --------------------------------------------------
# Generate dataset
# --------------------------------------------------

records = []

print(
    f"Generating {NUMBER_OF_IMAGES} "
    "synthetic image-mask pairs..."
)

for i in range(
    1,
    NUMBER_OF_IMAGES + 1,
):
    record = create_sample(i)
    records.append(record)

    print(
        f"{record['filename']} -> "
        f"damage: "
        f"{record['damage_percentage']}%"
    )


# --------------------------------------------------
# Save metadata
# --------------------------------------------------

with open(
    METADATA_FILE,
    "w",
    newline="",
    encoding="utf-8",
) as csv_file:

    fieldnames = [
        "filename",
        "healthy_pixels",
        "damaged_pixels",
        "crop_pixels",
        "damage_percentage",
        "severity",
    ]

    writer = csv.DictWriter(
        csv_file,
        fieldnames=fieldnames,
    )

    writer.writeheader()
    writer.writerows(records)


print()
print("Synthetic dataset created successfully.")
print(f"Images:   {IMAGES_DIR}")
print(f"Masks:    {MASKS_DIR}")
print(f"Previews: {PREVIEWS_DIR}")
print(f"Metadata: {METADATA_FILE}")