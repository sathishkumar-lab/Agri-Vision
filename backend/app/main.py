from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, HTTPException, UploadFile

from app.services.prediction_service import predict_image
from app.utils.image_processing import process_image


app = FastAPI(
    title="Agri-Vision API",
    description=(
        "Backend API for wheat image upload, preprocessing, "
        "disease prediction, and crop insurance claim verification."
    ),
    version="1.0.0",
)


# Maximum permitted upload size: 10 MB.
MAX_FILE_SIZE = 10 * 1024 * 1024

# MIME types accepted by the API.
ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
}

# File extensions accepted by the API.
ALLOWED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
}


# Find the backend folder from the location of this file.
BACKEND_FOLDER = Path(__file__).resolve().parents[1]

# Folder used to store original uploaded images.
UPLOAD_FOLDER = BACKEND_FOLDER / "uploads"

# Create the uploads folder automatically if it does not exist.
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)


@app.get("/")
def home() -> dict:
    """
    Check whether the Agri-Vision backend is running.
    """

    return {
        "message": "Welcome to the Agri-Vision API",
        "status": "running",
    }


@app.get("/health")
def health_check() -> dict:
    """
    Return a simple backend health response.
    """

    return {
        "status": "healthy",
        "service": "Agri-Vision API",
    }


@app.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
) -> dict:
    """
    Upload, validate, preprocess, and analyse one wheat-leaf image.
    """

    # Check the MIME type supplied with the uploaded file.
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, JPEG, and PNG images are allowed.",
        )

    original_filename = file.filename or "uploaded_image.jpg"

    # Get the extension, such as .jpg or .png.
    file_extension = Path(original_filename).suffix.lower()

    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="The file must have a .jpg, .jpeg, or .png extension.",
        )

    # Read the uploaded file as bytes.
    file_content = await file.read()

    if not file_content:
        raise HTTPException(
            status_code=400,
            detail="The uploaded image is empty.",
        )

    # Check whether the uploaded image exceeds 10 MB.
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="Image size must not exceed 10 MB.",
        )

    try:
        # Module 3:
        # Open the image, correct its orientation, convert it to RGB,
        # resize it to 224 × 224, and save the processed image.
        processed_image = process_image(
            file_content=file_content,
            original_filename=original_filename,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    # Generate a unique name for the original uploaded image.
    stored_filename = (
        f"{Path(original_filename).stem}_"
        f"{uuid4().hex}"
        f"{file_extension}"
    )

    original_image_path = UPLOAD_FOLDER / stored_filename

    try:
        # Save the original uploaded image.
        original_image_path.write_bytes(file_content)

    except OSError as error:
        raise HTTPException(
            status_code=500,
            detail="The original image could not be saved.",
        ) from error

    # process_image() returns a path such as:
    # processed_images/example_123.jpg
    processed_image_path = Path(
        processed_image["processed_path"]
    ).resolve()

    try:
        # Module 4:
        # Send the processed 224 × 224 image to the trained model.
        prediction_result = predict_image(
            processed_image_path
        )

    except (FileNotFoundError, ValueError, OSError) as error:
        raise HTTPException(
            status_code=500,
            detail=f"Image prediction failed: {error}",
        ) from error

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred during prediction.",
        ) from error

    return {
        "message": (
            "Image uploaded, processed, and analysed successfully"
        ),
        "original_image": {
            "original_filename": original_filename,
            "stored_filename": stored_filename,
            "image_type": file.content_type,
            "size_bytes": len(file_content),
        },
        "processed_image": {
            "stored_filename": (
                processed_image["processed_filename"]
            ),
            "width": processed_image["width"],
            "height": processed_image["height"],
            "image_mode": processed_image["image_mode"],
            "image_format": processed_image["image_format"],
        },
        "prediction": prediction_result["prediction"],
        "confidence": prediction_result["confidence"],
    }