from io import BytesIO
from pathlib import Path
from uuid import uuid4

from PIL import Image, ImageOps, UnidentifiedImageError


PROCESSED_IMAGE_FOLDER = Path("processed_images")
PROCESSED_IMAGE_FOLDER.mkdir(parents=True, exist_ok=True)

MODEL_IMAGE_SIZE = (224, 224)


def process_image(
    file_content: bytes,
    original_filename: str,
) -> dict:
    """
    Open, correct, convert, resize, and save an uploaded image.

    Args:
        file_content:
            The uploaded image stored as bytes.

        original_filename:
            The original name of the uploaded image.

    Returns:
        A dictionary containing processed-image information.

    Raises:
        ValueError:
            If the uploaded file cannot be opened as an image.
    """

    try:
        with Image.open(BytesIO(file_content)) as image:
            image = ImageOps.exif_transpose(image)
            image = image.convert("RGB")
            image = image.resize(
                MODEL_IMAGE_SIZE,
                Image.Resampling.LANCZOS,
            )

            unique_filename = (
                f"{Path(original_filename).stem}_"
                f"{uuid4().hex}.jpg"
            )

            processed_path = (
                PROCESSED_IMAGE_FOLDER / unique_filename
            )

            image.save(
                processed_path,
                format="JPEG",
                quality=90,
            )

            return {
                "processed_filename": unique_filename,
                "processed_path": str(processed_path),
                "width": image.width,
                "height": image.height,
                "image_mode": image.mode,
                "image_format": "JPEG",
            }

    except UnidentifiedImageError as error:
        raise ValueError(
            "The uploaded file is not a valid image."
        ) from error

    except OSError as error:
        raise ValueError(
            "The uploaded image could not be processed."
        ) from error