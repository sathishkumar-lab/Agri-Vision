from io import BytesIO
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

from app.utils.image_processing import process_image


app = FastAPI(
    title="Agri-Vision API",
    description="Backend API for crop image analysis.",
    version="0.3.0",
)


UPLOAD_FOLDER = Path("uploads")
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
}

MAX_FILE_SIZE = 10 * 1024 * 1024


@app.get("/")
def home() -> dict:
    return {
        "message": "Welcome to Agri-Vision API",
        "module": "Module 3 - Image Preprocessing",
    }


@app.post("/upload")
async def upload_image(
    file: UploadFile = File(...),
) -> dict:
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, JPEG and PNG images are allowed.",
        )

    file_content = await file.read()

    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Image size must not exceed 10 MB.",
        )

    if len(file_content) == 0:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty.",
        )

    try:
        with Image.open(BytesIO(file_content)) as image:
            image.verify()

        with Image.open(BytesIO(file_content)) as image:
            original_width = image.width
            original_height = image.height
            original_format = image.format

    except UnidentifiedImageError as error:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is not a valid image.",
        ) from error

    except OSError as error:
        raise HTTPException(
            status_code=400,
            detail="The uploaded image is damaged or unreadable.",
        ) from error

    original_extension = (
        Path(file.filename or "uploaded_image").suffix.lower()
    )

    if original_extension not in {".jpg", ".jpeg", ".png"}:
        original_extension = (
            ".png"
            if file.content_type == "image/png"
            else ".jpg"
        )

    stored_filename = (
        f"{uuid4().hex}{original_extension}"
    )

    original_file_path = (
        UPLOAD_FOLDER / stored_filename
    )

    original_file_path.write_bytes(file_content)

    try:
        processed_image = process_image(
            file_content=file_content,
            original_filename=file.filename or stored_filename,
        )

    except ValueError as error:
        original_file_path.unlink(missing_ok=True)

        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    return {
        "message": (
            "Image uploaded, validated and "
            "processed successfully"
        ),
        "original_image": {
            "original_filename": file.filename,
            "stored_filename": stored_filename,
            "image_type": file.content_type,
            "image_format": original_format,
            "width": original_width,
            "height": original_height,
            "size_bytes": len(file_content),
        },
        "processed_image": processed_image,
    }