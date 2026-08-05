from pathlib import Path
from typing import Annotated
from uuid import uuid4

from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import WithJsonSchema

from app.services.prediction_service import predict_image
from app.utils.image_processing import process_image
from app.utils.prediction_aggregation import aggregate_predictions


# Swagger uses the JSON schema below to display a file picker
# instead of treating uploaded files as ordinary text.
SwaggerUploadFile = Annotated[
    UploadFile,
    WithJsonSchema(
        {
            "type": "string",
            "format": "binary",
        }
    ),
]


app = FastAPI(
    title="Agri-Vision API",
    description=(
        "Backend API for wheat image upload, preprocessing, "
        "disease prediction, and crop insurance claim verification."
    ),
    version="1.0.0",
)


# Maximum permitted size for one uploaded image: 10 MB.
MAX_FILE_SIZE = 10 * 1024 * 1024

# Minimum number of images required for multi-image prediction.
MIN_MULTI_IMAGE_COUNT = 3

# Maximum number of images allowed for multi-image prediction.
MAX_MULTI_IMAGE_COUNT = 5

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


def validate_image_file(
    file: UploadFile,
    file_content: bytes,
) -> str:
    """
    Validate one uploaded image.

    Checks:
    - MIME type
    - File extension
    - Empty file
    - Maximum file size

    Returns:
        The validated original filename.

    Raises:
        HTTPException:
            If the uploaded file is invalid.
    """

    original_filename = file.filename or "uploaded_image.jpg"

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"{original_filename}: Only JPG, JPEG, "
                "and PNG images are allowed."
            ),
        )

    file_extension = Path(original_filename).suffix.lower()

    if file_extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"{original_filename}: The file must have a "
                ".jpg, .jpeg, or .png extension."
            ),
        )

    if not file_content:
        raise HTTPException(
            status_code=400,
            detail=(
                f"{original_filename}: "
                "The uploaded image is empty."
            ),
        )

    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=(
                f"{original_filename}: "
                "Image size must not exceed 10 MB."
            ),
        )

    return original_filename


def save_original_image(
    file_content: bytes,
    original_filename: str,
) -> str:
    """
    Save one original uploaded image using a unique filename.

    Returns:
        The generated stored filename.

    Raises:
        HTTPException:
            If the image cannot be saved.
    """

    file_extension = Path(original_filename).suffix.lower()

    stored_filename = (
        f"{Path(original_filename).stem}_"
        f"{uuid4().hex}"
        f"{file_extension}"
    )

    original_image_path = UPLOAD_FOLDER / stored_filename

    try:
        original_image_path.write_bytes(file_content)

    except OSError as error:
        raise HTTPException(
            status_code=500,
            detail=(
                f"{original_filename}: "
                "The original image could not be saved."
            ),
        ) from error

    return stored_filename


def process_and_predict_image(
    file_content: bytes,
    original_filename: str,
) -> tuple[dict, dict]:
    """
    Preprocess one image and run disease prediction.

    Returns:
        A tuple containing:
        - processed-image information
        - prediction information
    """

    try:
        processed_image = process_image(
            file_content=file_content,
            original_filename=original_filename,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=f"{original_filename}: {error}",
        ) from error

    processed_image_path = Path(
        processed_image["processed_path"]
    ).resolve()

    try:
        prediction_result = predict_image(
            processed_image_path
        )

    except (FileNotFoundError, ValueError, OSError) as error:
        raise HTTPException(
            status_code=500,
            detail=(
                f"{original_filename}: "
                f"Image prediction failed: {error}"
            ),
        ) from error

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=(
                f"{original_filename}: "
                "An unexpected error occurred during prediction."
            ),
        ) from error

    return processed_image, prediction_result


@app.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
) -> dict:
    """
    Upload, validate, preprocess, and analyse one wheat-leaf image.
    """

    file_content = await file.read()

    original_filename = validate_image_file(
        file=file,
        file_content=file_content,
    )

    processed_image, prediction_result = (
        process_and_predict_image(
            file_content=file_content,
            original_filename=original_filename,
        )
    )

    stored_filename = save_original_image(
        file_content=file_content,
        original_filename=original_filename,
    )

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


@app.post("/predict-multiple-images")
async def predict_multiple_images(
    files: Annotated[
        list[SwaggerUploadFile],
        File(
            description="Upload between 3 and 5 wheat leaf images."
        ),
    ],
) -> dict:
    """
    Upload and analyse between 3 and 5 wheat-leaf images.

    Each image is validated, preprocessed, and sent to the
    trained MobileNetV2 model.

    The individual predictions are then combined using:
    - majority voting
    - average confidence for tie resolution
    """

    image_count = len(files)

    if (
        image_count < MIN_MULTI_IMAGE_COUNT
        or image_count > MAX_MULTI_IMAGE_COUNT
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Please upload between 3 and 5 "
                "wheat leaf images."
            ),
        )

    individual_predictions: list[dict] = []

    for file in files:
        file_content = await file.read()

        original_filename = validate_image_file(
            file=file,
            file_content=file_content,
        )

        processed_image, prediction_result = (
            process_and_predict_image(
                file_content=file_content,
                original_filename=original_filename,
            )
        )

        stored_filename = save_original_image(
            file_content=file_content,
            original_filename=original_filename,
        )

        individual_predictions.append(
            {
                "original_filename": original_filename,
                "stored_filename": stored_filename,
                "processed_filename": (
                    processed_image["processed_filename"]
                ),
                "image_type": file.content_type,
                "size_bytes": len(file_content),
                "prediction": prediction_result["prediction"],
                "confidence": prediction_result["confidence"],
            }
        )

    try:
        final_result = aggregate_predictions(
            individual_predictions
        )

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    return {
        "message": (
            "Multiple wheat leaf images were uploaded, "
            "processed, and analysed successfully"
        ),
        "total_images": image_count,
        "individual_predictions": individual_predictions,
        "final_result": final_result,
    }