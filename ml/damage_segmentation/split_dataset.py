from pathlib import Path
import random
import shutil


# ------------------------------------------
# Configuration
# ------------------------------------------

RANDOM_SEED = 42

TRAIN_COUNT = 35
VALIDATION_COUNT = 7
TEST_COUNT = 8


BASE_DIR = Path(__file__).resolve().parent

SOURCE_DIR = BASE_DIR / "synthetic_dataset"
SOURCE_IMAGES = SOURCE_DIR / "images"
SOURCE_MASKS = SOURCE_DIR / "masks"

OUTPUT_DIR = BASE_DIR / "dataset_split"


# ------------------------------------------
# Create output folders
# ------------------------------------------

for split in ["train", "validation", "test"]:

    (OUTPUT_DIR / split / "images").mkdir(
        parents=True,
        exist_ok=True,
    )

    (OUTPUT_DIR / split / "masks").mkdir(
        parents=True,
        exist_ok=True,
    )


# ------------------------------------------
# Get all image filenames
# ------------------------------------------

image_files = sorted(
    SOURCE_IMAGES.glob("*.png")
)

print(f"Total images found: {len(image_files)}")


# ------------------------------------------
# Validate dataset
# ------------------------------------------

if len(image_files) != 50:
    raise ValueError(
        f"Expected 50 images, "
        f"but found {len(image_files)}."
    )


for image_path in image_files:

    mask_path = SOURCE_MASKS / image_path.name

    if not mask_path.exists():
        raise FileNotFoundError(
            f"Mask not found for {image_path.name}"
        )


print("All images have matching masks.")


# ------------------------------------------
# Shuffle dataset
# ------------------------------------------

random.seed(RANDOM_SEED)
random.shuffle(image_files)


# ------------------------------------------
# Split filenames
# ------------------------------------------

train_files = image_files[:TRAIN_COUNT]

validation_files = image_files[
    TRAIN_COUNT:
    TRAIN_COUNT + VALIDATION_COUNT
]

test_files = image_files[
    TRAIN_COUNT + VALIDATION_COUNT:
]


# ------------------------------------------
# Copy image-mask pairs
# ------------------------------------------

def copy_pairs(files, split_name):

    image_destination = (
        OUTPUT_DIR / split_name / "images"
    )

    mask_destination = (
        OUTPUT_DIR / split_name / "masks"
    )

    for image_path in files:

        mask_path = (
            SOURCE_MASKS / image_path.name
        )

        shutil.copy2(
            image_path,
            image_destination / image_path.name,
        )

        shutil.copy2(
            mask_path,
            mask_destination / mask_path.name,
        )

    print(
        f"{split_name}: "
        f"{len(files)} image-mask pairs copied."
    )


copy_pairs(
    train_files,
    "train",
)

copy_pairs(
    validation_files,
    "validation",
)

copy_pairs(
    test_files,
    "test",
)


# ------------------------------------------
# Final verification
# ------------------------------------------

total_split = (
    len(train_files)
    + len(validation_files)
    + len(test_files)
)

if total_split != len(image_files):
    raise ValueError(
        "Dataset split count does not match "
        "the original dataset."
    )


print()
print("Dataset split completed successfully.")
print(f"Training:   {len(train_files)}")
print(f"Validation: {len(validation_files)}")
print(f"Testing:    {len(test_files)}")
print(f"Total:      {total_split}")
