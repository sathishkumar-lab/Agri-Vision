import io
from pathlib import Path
from typing import Annotated, Any, Literal
from uuid import uuid4

from dotenv import load_dotenv

ENV_PATH = Path(__file__).resolve().parents[1] / ".env"
load_dotenv(dotenv_path=ENV_PATH)

from PIL import Image

from fastapi import (
    FastAPI,
    File,
    Form,
    HTTPException,
    UploadFile,
)

from fastapi.staticfiles import StaticFiles

from pydantic import BaseModel, Field, WithJsonSchema

from app.services.prediction_service import (
    predict_image,
)

from app.services.damage_segmentation import (
    predict_damage,
)

from app.services.claim_repository import (
    DatabaseUnavailableError,
    get_claim,
    list_claims,
    save_claim_evidence,
    save_officer_verification,
    calculate_evidence_score,
    calculate_geographic_distance,
)

from app.utils.image_processing import (
    process_image,
)

from app.utils.prediction_aggregation import (
    aggregate_predictions,
)

from app.services.farmer_repository import (
    register_farmer,
    authenticate_farmer,
    get_farmer_by_code,
    get_farmer_by_mobile,
    create_farm,
    get_farms_by_farmer,
    get_farm_by_id,
)

from app.services.officer_repository import (
    initialize_officer_schema,
    authenticate_officer,
    get_officer_by_identifier,
    list_officers,
    register_officer,
)



# ============================================================
# Swagger upload file configuration
# ============================================================

SwaggerUploadFile = Annotated[
    UploadFile,
    WithJsonSchema(
        {
            "type": "string",
            "format": "binary",
        }
    ),
]


# ============================================================
# FastAPI application
# ============================================================

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Agri-Vision API",
    description=(
        "Backend API for wheat image upload, "
        "disease prediction, approved Stage 2 damage segmentation, "
        "and officer-reviewed crop insurance claim evidence. AI outputs "
        "are decision-support evidence only; officers make final decisions."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    """Initialize PostgreSQL database schemas on backend startup."""
    try:
        from app.services.claim_repository import initialize_schema
        initialize_schema()
        from app.services.observation_repository import initialize_observation_schema
        initialize_observation_schema()
        from app.services.officer_repository import initialize_officer_schema
        initialize_officer_schema()
    except Exception as e:
        print(f"Startup DB init warning: {e}")




# ============================================================
# Configuration
# ============================================================

MAX_FILE_SIZE = (
    10 * 1024 * 1024
)

MIN_MULTI_IMAGE_COUNT = 3

MAX_MULTI_IMAGE_COUNT = 5

# Damage estimation accepts 3 to 5 field images for multi-image endpoint.
MIN_DAMAGE_IMAGE_COUNT = 3

MAX_DAMAGE_IMAGE_COUNT = 5


ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
}


ALLOWED_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
}


# ============================================================
# Backend folders
# ============================================================

BACKEND_FOLDER = (
    Path(__file__).resolve().parents[1]
)


# ------------------------------------------------------------
# Uploaded original images
# ------------------------------------------------------------

UPLOAD_FOLDER = (
    BACKEND_FOLDER / "uploads"
)

UPLOAD_FOLDER.mkdir(
    parents=True,
    exist_ok=True,
)


# ------------------------------------------------------------
# Damage result folders
# ------------------------------------------------------------

DAMAGE_RESULTS_FOLDER = (
    BACKEND_FOLDER
    / "damage_results"
)

DAMAGE_RESULTS_FOLDER.mkdir(
    parents=True,
    exist_ok=True,
)


DAMAGE_MASK_FOLDER = (
    DAMAGE_RESULTS_FOLDER
    / "masks"
)

DAMAGE_MASK_FOLDER.mkdir(
    parents=True,
    exist_ok=True,
)


DAMAGE_OVERLAY_FOLDER = (
    DAMAGE_RESULTS_FOLDER
    / "overlays"
)

DAMAGE_OVERLAY_FOLDER.mkdir(
    parents=True,
    exist_ok=True,
)


# ============================================================
# Static files
# ============================================================

app.mount(
    "/damage-results",
    StaticFiles(
        directory=DAMAGE_RESULTS_FOLDER
    ),
    name="damage-results",
)

app.mount(
    "/uploads",
    StaticFiles(directory=UPLOAD_FOLDER),
    name="uploads",
)


# ============================================================
# Home
# ============================================================

@app.get("/")
def home() -> dict:
    """
    Check whether the Agri-Vision backend is running.
    """

    return {
        "message": (
            "Welcome to the Agri-Vision API"
        ),
        "status": "running",
    }


# ============================================================
# Health check
# ============================================================

@app.get("/health")
def health_check() -> dict:
    """
    Return a simple backend health response.
    """

    return {
        "status": "healthy",
        "service": "Agri-Vision API",
    }


# ============================================================
# Validate image
# ============================================================

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
    """

    original_filename = (
        file.filename
        or "uploaded_image.jpg"
    )

    # --------------------------------------------------------
    # MIME type
    # --------------------------------------------------------

    if (
        file.content_type
        not in ALLOWED_CONTENT_TYPES
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                f"{original_filename}: "
                "Only JPG, JPEG, and PNG "
                "images are allowed."
            ),
        )

    # --------------------------------------------------------
    # Extension
    # --------------------------------------------------------

    file_extension = (
        Path(
            original_filename
        ).suffix.lower()
    )

    if (
        file_extension
        not in ALLOWED_EXTENSIONS
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                f"{original_filename}: "
                "The file must have a "
                ".jpg, .jpeg, or .png extension."
            ),
        )

    # --------------------------------------------------------
    # Empty file
    # --------------------------------------------------------

    if not file_content:

        raise HTTPException(
            status_code=400,
            detail=(
                f"{original_filename}: "
                "The uploaded image is empty."
            ),
        )

    # --------------------------------------------------------
    # File size
    # --------------------------------------------------------

    if (
        len(file_content)
        > MAX_FILE_SIZE
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                f"{original_filename}: "
                "Image size must not exceed "
                "10 MB."
            ),
        )

    # --------------------------------------------------------
    # Image integrity check (corrupted or invalid image)
    # --------------------------------------------------------

    try:
        with Image.open(io.BytesIO(file_content)) as img:
            img.verify()
    except Exception as error:
        raise HTTPException(
            status_code=400,
            detail=(
                f"{original_filename}: "
                "Corrupted or invalid image file."
            ),
        ) from error

    return original_filename


# ============================================================
# Save original image
# ============================================================

def save_original_image(
    file_content: bytes,
    original_filename: str,
) -> str:
    """
    Save original uploaded image
    using a unique filename.
    """

    file_extension = (
        Path(
            original_filename
        ).suffix.lower()
    )

    stored_filename = (
        f"{Path(original_filename).stem}_"
        f"{uuid4().hex}"
        f"{file_extension}"
    )

    original_image_path = (
        UPLOAD_FOLDER
        / stored_filename
    )

    try:

        original_image_path.write_bytes(
            file_content
        )

    except OSError as error:

        raise HTTPException(
            status_code=500,
            detail=(
                f"{original_filename}: "
                "The original image could "
                "not be saved."
            ),
        ) from error

    return stored_filename


# ============================================================
# Disease prediction helper
# ============================================================

def process_and_predict_image(
    file_content: bytes,
    original_filename: str,
) -> tuple[dict, dict]:
    """
    Preprocess one image and run
    disease prediction.
    """

    try:

        processed_image = (
            process_image(
                file_content=file_content,
                original_filename=original_filename,
            )
        )

    except ValueError as error:

        raise HTTPException(
            status_code=400,
            detail=(
                f"{original_filename}: "
                f"{error}"
            ),
        ) from error

    processed_image_path = Path(
        processed_image[
            "processed_path"
        ]
    ).resolve()

    try:

        prediction_result = (
            predict_image(
                processed_image_path
            )
        )

    except (
        FileNotFoundError,
        ValueError,
        OSError,
    ) as error:

        raise HTTPException(
            status_code=500,
            detail=(
                f"{original_filename}: "
                f"Image prediction failed: "
                f"{error}"
            ),
        ) from error

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=(
                f"{original_filename}: "
                "An unexpected error occurred "
                "during prediction."
            ),
        ) from error

    return (
        processed_image,
        prediction_result,
    )


class OfficerVerificationRequest(BaseModel):
    """An authorized officer's final decision on persisted AI evidence."""

    officer_name: str = Field(min_length=1, max_length=200)
    final_decision: Literal["approved", "rejected", "needs_more_evidence"]
    notes: str | None = Field(default=None, max_length=4000)



# ============================================================
# FARMER & FARM MANAGEMENT SCHEMAS & ENDPOINTS
# ============================================================

class FarmerRegistrationRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=200)
    mobile_number: str = Field(min_length=10, max_length=15)
    email: str | None = Field(default=None)
    address: str = Field(min_length=1, max_length=500)
    district: str = Field(min_length=1, max_length=100)
    state: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=4, max_length=100)


class FarmerLoginRequest(BaseModel):
    identifier: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=100)


class FarmRegistrationRequest(BaseModel):
    farmer_id: str = Field(min_length=1, max_length=100)
    crop_type: str = Field(min_length=1, max_length=100, default="Durum Wheat")
    area_acres: float = Field(gt=0, default=5.0)
    survey_number: str | None = Field(default=None)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


@app.post("/api/farmers/register", summary="Register New Farmer Account")
@app.post("/farmers/register", summary="Register New Farmer Account")
def api_register_farmer(req: FarmerRegistrationRequest) -> dict:
    """Register a new farmer account with hashed password and unique farmer_code."""
    try:
        farmer = register_farmer(req.dict())
        return {
            "message": "Farmer registered successfully.",
            "farmer": farmer
        }
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Farmer registration failed: {err}")


@app.post("/api/farmers/login", summary="Farmer Login")
@app.post("/farmers/login", summary="Farmer Login")
def api_login_farmer(req: FarmerLoginRequest) -> dict:
    """Authenticate farmer using mobile number or farmer_code + password."""
    farmer = authenticate_farmer(req.identifier, req.password)
    if not farmer:
        raise HTTPException(status_code=401, detail="Invalid mobile number/Farmer ID or password.")
    return {
        "message": "Login successful.",
        "farmer": farmer
    }


@app.get("/api/farmers/me/{farmer_identifier}", summary="Get Logged-in Farmer Profile")
@app.get("/farmers/me/{farmer_identifier}", summary="Get Logged-in Farmer Profile")
def api_get_farmer_me(farmer_identifier: str) -> dict:
    """Return profile metadata for a farmer by farmer_code or mobile number."""
    farmer = get_farmer_by_code(farmer_identifier) or get_farmer_by_mobile(farmer_identifier)
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer profile not found.")
    return {
        "farmer": farmer
    }


# ============================================================
# FIELD OFFICER SCHEMAS & ENDPOINTS
# ============================================================

class OfficerLoginRequest(BaseModel):
    identifier: str = Field(min_length=1, max_length=150)
    password: str = Field(min_length=1, max_length=100)


class OfficerRegistrationRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=200)
    badge_number: str = Field(min_length=1, max_length=50)
    email: str = Field(min_length=3, max_length=200)
    role: str = Field(default="Field Claims Adjuster", max_length=100)
    department: str = Field(default="Agricultural Insurance Division", max_length=200)
    district: str = Field(default="Coimbatore", max_length=100)
    state: str = Field(default="Tamil Nadu", max_length=100)
    password: str = Field(min_length=4, max_length=100)


@app.post("/api/officers/login", summary="Field Officer Login")
@app.post("/officers/login", summary="Field Officer Login")
def api_login_officer(req: OfficerLoginRequest) -> dict:
    """Authenticate field officer / insurance adjuster using officer_code, badge_number, or email."""
    officer = authenticate_officer(req.identifier, req.password)
    if not officer:
        raise HTTPException(status_code=401, detail="Invalid Officer ID / Badge Number or password.")
    return {
        "message": "Field Officer login successful.",
        "officer": officer
    }


@app.get("/api/officers/list", summary="List Field Officers")
@app.get("/officers/list", summary="List Field Officers")
def api_list_officers() -> dict:
    """Return list of active field officers for quick access / selection."""
    officers = list_officers()
    return {
        "total_officers": len(officers),
        "officers": officers
    }


@app.get("/api/officers/me/{officer_identifier}", summary="Get Logged-in Officer Profile")
@app.get("/officers/me/{officer_identifier}", summary="Get Logged-in Officer Profile")
def api_get_officer_me(officer_identifier: str) -> dict:
    """Return officer profile by officer_code, badge_number, or email."""
    officer = get_officer_by_identifier(officer_identifier)
    if not officer:
        raise HTTPException(status_code=404, detail="Field Officer profile not found.")
    return {
        "officer": officer
    }


@app.post("/api/officers/register", summary="Register New Field Officer")
@app.post("/officers/register", summary="Register New Field Officer")
def api_register_officer(req: OfficerRegistrationRequest) -> dict:
    """Register a new authorized field officer profile."""
    try:
        officer = register_officer(req.dict())
        return {
            "message": "Field Officer registered successfully.",
            "officer": officer
        }
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Officer registration failed: {err}")



@app.post("/api/farms", summary="Register New Farm Plot")
@app.post("/farms", summary="Register New Farm Plot")
def api_create_farm(req: FarmRegistrationRequest) -> dict:
    """Register a new farm plot linked to a farmer ID."""
    farmer = get_farmer_by_code(req.farmer_id) or get_farmer_by_mobile(req.farmer_id)
    farmer_uuid = farmer["id"] if farmer else req.farmer_id
    
    farm_data = req.dict()
    farm_data["farmer_id"] = farmer_uuid
    try:
        farm = create_farm(farm_data)
        return {
            "message": "Farm plot registered successfully.",
            "farm": farm
        }
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Farm registration failed: {err}")


@app.get("/api/farms/my-farms/{farmer_identifier}", summary="List Registered Farms for a Farmer")
@app.get("/farms/my-farms/{farmer_identifier}", summary="List Registered Farms for a Farmer")
def api_get_my_farms(farmer_identifier: str) -> dict:
    """Return all registered farm plots for a farmer."""
    farms = get_farms_by_farmer(farmer_identifier)
    return {
        "total_farms": len(farms),
        "farms": farms
    }


@app.get("/api/farms/{farm_identifier}", summary="Get Farm Plot Details")
@app.get("/farms/{farm_identifier}", summary="Get Farm Plot Details")
def api_get_farm(farm_identifier: str) -> dict:
    """Get single farm plot by farm_id or farm_code."""
    farm = get_farm_by_id(farm_identifier)
    if not farm:
        raise HTTPException(status_code=404, detail="Farm plot not found.")
    return farm


# ============================================================
# CLAIM MANAGEMENT ENDPOINTS
# ============================================================

class ClaimSubmissionRequest(BaseModel):
    farmer_name: str = Field(min_length=1, max_length=200, default="John Doe")
    farmer_id: str = Field(min_length=1, max_length=100, default="FARM-2026-001")
    farm_name: str = Field(min_length=1, max_length=200, default="Green Valley Farm")
    crop_variety: str = Field(min_length=1, max_length=100, default="Durum Wheat")
    farm_latitude: float | None = Field(default=31.5204)
    farm_longitude: float | None = Field(default=74.3587)
    claim_latitude: float | None = Field(default=31.5210)
    claim_longitude: float | None = Field(default=74.3592)
    location_source: str | None = Field(default="Browser GPS")
    disease_analysis: dict = Field(default_factory=dict)
    damage_analysis: dict = Field(default_factory=dict)
    close_up_images: list[dict] = Field(default_factory=list)
    field_images: list[dict] = Field(default_factory=list)
    exif_metadata: dict = Field(default_factory=dict)
    
    # Optional linked Farmer & Farm IDs for registered accounts
    db_farmer_id: str | None = Field(default=None)
    db_farm_id: str | None = Field(default=None)
    farmer_code: str | None = Field(default=None)
    farm_code: str | None = Field(default=None)


@app.post("/api/claims", summary="Create and Submit New Crop Claim")
@app.post("/claims", summary="Create and Submit New Crop Claim")
async def create_claim(claim: ClaimSubmissionRequest) -> dict:
    """Submit a complete AI-analyzed crop claim for verification."""
    claim_dict = claim.dict()
    
    # Enrich with linked farmer and farm profiles if provided
    target_farmer_code = claim.farmer_code or claim.db_farmer_id
    if target_farmer_code:
        farmer_profile = get_farmer_by_code(target_farmer_code) or get_farmer_by_mobile(target_farmer_code)
        if farmer_profile:
            claim_dict["farmer_profile"] = farmer_profile
            claim_dict["db_farmer_id"] = farmer_profile["id"]
            claim_dict["farmer_code"] = farmer_profile["farmer_code"]

    target_farm_code = claim.farm_code or claim.db_farm_id
    if target_farm_code:
        farm_profile = get_farm_by_id(target_farm_code)
        if farm_profile:
            claim_dict["farm_profile"] = farm_profile
            claim_dict["db_farm_id"] = farm_profile["id"]
            claim_dict["farm_code"] = farm_profile["farm_code"]
    
    # Resolve coordinates against registered farm parcel if on-site claim
    if claim.claim_latitude is None and claim.farm_latitude is not None:
        claim_dict["claim_latitude"] = claim.farm_latitude
        claim_dict["claim_longitude"] = claim.farm_longitude

    # Calculate geographical distance if coordinates exist
    if (
        claim_dict.get("farm_latitude") is not None and claim_dict.get("farm_longitude") is not None
        and claim_dict.get("claim_latitude") is not None and claim_dict.get("claim_longitude") is not None
    ):
        dist_km = calculate_geographic_distance(
            claim_dict["farm_latitude"], claim_dict["farm_longitude"],
            claim_dict["claim_latitude"], claim_dict["claim_longitude"]
        )
        location_evidence = {
            "distance_km": dist_km,
            "gps_captured": True,
            "source": claim.location_source or ("Registered Farm Parcel Verification" if claim.claim_latitude is None else "GPS Acquisition"),
            "farm_location": [claim_dict["farm_latitude"], claim_dict["farm_longitude"]],
            "claim_location": [claim_dict["claim_latitude"], claim_dict["claim_longitude"]],
            "status": "Within acceptable field region (GEOFENCE PASS)" if dist_km <= 2.0 else "Distance review required"
        }
    else:
        location_evidence = {
            "distance_km": None,
            "gps_captured": claim.claim_latitude is not None,
            "source": claim.location_source or "Manual",
            "status": "Coordinates partially or unavailable"
        }
    
    claim_dict["location_evidence"] = location_evidence
    claim_id = save_claim_evidence(claim_dict)
    
    saved_claim = get_claim(claim_id)
    return {
        "message": "Crop claim submitted successfully and evidence snapshot saved.",
        "claim_id": claim_id,
        "status": "pending_review",
        "claim": saved_claim
    }


@app.get("/api/claims", summary="List All Claims")
@app.get("/claims", summary="List All Claims")
def get_all_claims() -> dict:
    """Return all submitted crop claims for dashboard listing."""
    claims_list = list_claims()
    return {
        "total_claims": len(claims_list),
        "claims": claims_list
    }


@app.get("/api/claims/{claim_id}", summary="Get Claim by ID")
@app.get("/claims/{claim_id}", summary="Get Claim by ID")
def get_single_claim(claim_id: str) -> dict:
    """Return detailed claim record by claim_id."""
    claim = get_claim(claim_id)
    if claim is None:
        raise HTTPException(status_code=404, detail="Claim not found.")
    return claim


@app.post("/api/claims/{claim_id}/verify", summary="Verify Claim (Officer Review)")
@app.post("/claims/{claim_id}/verify", summary="Verify Claim (Officer Review)")
def verify_claim(claim_id: str, request: OfficerVerificationRequest) -> dict:
    """Record an authorized officer's final verification decision."""
    success = save_officer_verification(
        claim_id=claim_id,
        officer_name=request.officer_name,
        final_decision=request.final_decision,
        notes=request.notes
    )
    if not success:
        raise HTTPException(status_code=404, detail="Claim not found or could not be updated.")
    
    updated_claim = get_claim(claim_id)
    return {
        "message": "Officer verification decision recorded successfully.",
        "claim_id": claim_id,
        "officer_verification": updated_claim["officer_verification"] if updated_claim else {}
    }


@app.post("/api/admin/clear-all-data", summary="Clear All Database Data")
def clear_all_data() -> dict:
    """Clear all JSON store files and truncate PostgreSQL database tables for fresh manual data entry."""
    import os
    from pathlib import Path
    data_dir = Path(__file__).resolve().parents[1] / "data"
    dict_files = ["claims_store.json", "farmers_store.json", "farms_store.json"]
    list_files = ["observations_store.json", "observation_images_store.json"]
    for fname in dict_files:
        fpath = data_dir / fname
        if fpath.exists():
            fpath.write_text("{}", encoding="utf-8")
    for fname in list_files:
        fpath = data_dir / fname
        if fpath.exists():
            fpath.write_text("[]", encoding="utf-8")
    
    db_url = os.getenv("AGRI_VISION_DATABASE_URL")
    if db_url:
        try:
            import psycopg
            with psycopg.connect(db_url) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
                    tables = [row[0] for row in cur.fetchall()]
                    for table in tables:
                        cur.execute(f'TRUNCATE TABLE "{table}" CASCADE;')
                    conn.commit()
        except Exception as e:
            print(f"Admin clear DB note: {e}")

    return {"message": "All database and JSON store data cleared successfully. System ready for fresh manual entries."}


# ============================================================
# SINGLE DISEASE PREDICTION
# ============================================================

@app.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
) -> dict:
    """
    Upload, validate, preprocess,
    and analyse one wheat-leaf image.
    """

    file_content = await file.read()

    original_filename = (
        validate_image_file(
            file=file,
            file_content=file_content,
        )
    )

    (
        processed_image,
        prediction_result,
    ) = process_and_predict_image(
        file_content=file_content,
        original_filename=original_filename,
    )

    stored_filename = (
        save_original_image(
            file_content=file_content,
            original_filename=original_filename,
        )
    )

    return {
        "message": (
            "Image uploaded, processed, "
            "and analysed successfully"
        ),

        "original_image": {
            "original_filename": (
                original_filename
            ),

            "stored_filename": (
                stored_filename
            ),

            "image_type": (
                file.content_type
            ),

            "size_bytes": len(
                file_content
            ),
        },

        "processed_image": {
            "stored_filename": (
                processed_image[
                    "processed_filename"
                ]
            ),

            "width": (
                processed_image[
                    "width"
                ]
            ),

            "height": (
                processed_image[
                    "height"
                ]
            ),

            "image_mode": (
                processed_image[
                    "image_mode"
                ]
            ),

            "image_format": (
                processed_image[
                    "image_format"
                ]
            ),
        },

        "prediction": (
            prediction_result[
                "prediction"
            ]
        ),

        "confidence": (
            prediction_result[
                "confidence"
            ]
        ),
    }


# ============================================================
# MULTI-IMAGE DISEASE PREDICTION
# ============================================================

@app.post("/predict-multiple-images")
async def predict_multiple_images(
    files: Annotated[
        list[SwaggerUploadFile],
        File(
            description=(
                "Upload between 3 and 5 "
                "wheat leaf images."
            )
        ),
    ],
) -> dict:
    """
    Upload and analyse between 3 and 5
    wheat-leaf images.

    This endpoint is for disease prediction.
    """

    image_count = len(files)

    if (
        image_count
        < MIN_MULTI_IMAGE_COUNT
        or image_count
        > MAX_MULTI_IMAGE_COUNT
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                "Please upload between 3 and 5 "
                "wheat leaf images."
            ),
        )

    individual_predictions = []

    for file in files:

        file_content = await file.read()

        original_filename = (
            validate_image_file(
                file=file,
                file_content=file_content,
            )
        )

        (
            processed_image,
            prediction_result,
        ) = process_and_predict_image(
            file_content=file_content,
            original_filename=original_filename,
        )

        stored_filename = (
            save_original_image(
                file_content=file_content,
                original_filename=original_filename,
            )
        )

        individual_predictions.append(
            {
                "original_filename": (
                    original_filename
                ),

                "stored_filename": (
                    stored_filename
                ),

                "processed_filename": (
                    processed_image[
                        "processed_filename"
                    ]
                ),

                "image_type": (
                    file.content_type
                ),

                "size_bytes": len(
                    file_content
                ),

                "prediction": (
                    prediction_result[
                        "prediction"
                    ]
                ),

                "confidence": (
                    prediction_result[
                        "confidence"
                    ]
                ),
            }
        )

    try:

        final_result = (
            aggregate_predictions(
                individual_predictions
            )
        )

    except ValueError as error:

        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    return {
        "message": (
            "Multiple wheat leaf images "
            "were uploaded, processed, "
            "and analysed successfully"
        ),

        "total_images": image_count,

        "individual_predictions": (
            individual_predictions
        ),

        "final_result": final_result,
    }


# ============================================================
# SINGLE IMAGE DAMAGE PREDICTION
# ============================================================

@app.post(
    "/predict-damage",
    summary="Estimate Visible Wheat Crop Damage (Single Image)",
    description=(
        "Segment wheat field images into three classes (0=background, 1=healthy wheat, "
        "2=damaged wheat) using the authoritative production Residual U-Net model.\n\n"
        "Calculates crop-only damage percentage using the formula:\n"
        "$$\\text{damage\\_percentage} = \\frac{\\text{damaged\\_crop\\_pixels}}"
        "{\\text{healthy\\_crop\\_pixels} + \\text{damaged\\_crop\\_pixels}} \\times 100$$\\n\\n"
        "Performs persistent model inference, saves grayscale segmentation masks and colored "
        "overlays, and returns pixel counts and class distribution."
    ),
    response_description="Detailed damage segmentation results, class distribution, and mask URLs.",
)
async def predict_damage_endpoint(
    file: UploadFile = File(..., description="Uploaded field/canopy image file (.jpg, .jpeg, .png, max 10MB)"),
) -> dict:
    """
    Estimate visible crop damage from one field image.
    Uses the deployed, validated scratch-trained three-class model.
    """
    file_content = await file.read()
    original_filename = validate_image_file(
        file=file,
        file_content=file_content,
    )

    stored_filename = save_original_image(
        file_content=file_content,
        original_filename=original_filename,
    )

    original_image_path = UPLOAD_FOLDER / stored_filename

    try:
        damage_result = predict_damage(
            str(original_image_path),
            output_name=Path(stored_filename).stem,
        )
    except (FileNotFoundError, ValueError, OSError) as error:
        raise HTTPException(
            status_code=500,
            detail=f"{original_filename}: Damage segmentation failed: {error}",
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"{original_filename}: An unexpected error occurred during damage segmentation.",
        ) from error

    mask_url = f"/damage-results/masks/{damage_result['mask_filename']}"
    overlay_url = f"/damage-results/overlays/{damage_result['overlay_filename']}"

    return {
        "message": "Image uploaded and damage segmentation completed successfully",
        "prediction_status": "completed",
        "image": {
            "original_filename": original_filename,
            "stored_filename": stored_filename,
            "image_type": file.content_type,
            "size_bytes": len(file_content),
            "width": damage_result["image_width"],
            "height": damage_result["image_height"],
        },
        "damage_analysis": {
            "status": "completed",
            "model": damage_result["model"],
            "model_checkpoint": damage_result["model_checkpoint"],
            "input_size": [256, 256],
            "background_pixel_count": damage_result["background_pixels"],
            "healthy_wheat_pixel_count": damage_result["healthy_crop_pixels"],
            "damaged_wheat_pixel_count": damage_result["damaged_crop_pixels"],
            "total_crop_pixels": damage_result["total_crop_pixels"],
            "total_image_pixels": damage_result["total_pixels"],
            "damage_percentage": round(damage_result["damage_percentage"], 4),
            "visible_damage_percentage": round(damage_result["damage_percentage"], 4),
            "class_distribution": damage_result["class_distribution"],
            "mask_url": mask_url,
            "overlay_url": overlay_url,
        },
        "verification": {
            "status": "Officer validation required",
            "note": (
                "The visible damage percentage is an AI-based decision-support "
                "estimate and should be reviewed by an authorized officer."
            ),
        },
    }


# ============================================================
# MULTIPLE IMAGE DAMAGE PREDICTION
# ============================================================

@app.post(
    "/predict-multiple-damage",
    summary="Estimate Visible Wheat Crop Damage (Multiple Field Images)",
    description=(
        "Estimate visible crop damage across 2 to 4 field-view images using "
        "the authoritative production Residual U-Net damage segmentation model.\n\n"
        "Each image is segmented into 3 classes (0=background, 1=healthy wheat, 2=damaged wheat). "
        "The overall field damage percentage is aggregated using crop-pixel weighted damage:\n"
        "$$\\text{overall\\_damage} = \\frac{\\sum \\text{damaged\\_crop\\_pixels}}"
        "{\\sum \\text{total\\_crop\\_pixels}} \\times 100$$"
    ),
    response_description="Individual image segmentation results and aggregate field damage analysis.",
)
async def predict_multiple_damage(
    files: Annotated[
        list[SwaggerUploadFile],
        File(
            description=(
                "Upload between 2 and 4 wide "
                "field images for visible "
                "damage estimation."
            )
        ),
    ],
) -> dict:
    """
    Estimate visible crop damage from 2 to 4 field images.
    """
    image_count = len(files)

    if (
        image_count < MIN_DAMAGE_IMAGE_COUNT
        or image_count > MAX_DAMAGE_IMAGE_COUNT
    ):
        raise HTTPException(
            status_code=400,
            detail="Please upload between 3 and 5 field images for damage estimation.",
        )

    individual_results = []

    for index, file in enumerate(files, start=1):
        file_content = await file.read()
        original_filename = validate_image_file(
            file=file,
            file_content=file_content,
        )

        stored_filename = save_original_image(
            file_content=file_content,
            original_filename=original_filename,
        )

        original_image_path = UPLOAD_FOLDER / stored_filename

        try:
            damage_result = predict_damage(
                str(original_image_path),
                output_name=Path(stored_filename).stem,
            )
        except (FileNotFoundError, ValueError, OSError) as error:
            raise HTTPException(
                status_code=500,
                detail=f"{original_filename}: Damage segmentation failed: {error}",
            ) from error
        except Exception as error:
            raise HTTPException(
                status_code=500,
                detail=f"{original_filename}: An unexpected error occurred during damage segmentation.",
            ) from error

        mask_url = f"/damage-results/masks/{damage_result['mask_filename']}"
        overlay_url = f"/damage-results/overlays/{damage_result['overlay_filename']}"

        individual_results.append(
            {
                "image_number": index,
                "original_filename": original_filename,
                "stored_filename": stored_filename,
                "image_type": file.content_type,
                "size_bytes": len(file_content),
                "image_dimensions": {
                    "width": damage_result["image_width"],
                    "height": damage_result["image_height"],
                },
                "damage_percentage": round(damage_result["damage_percentage"], 4),
                "visible_damage_percentage": round(damage_result["damage_percentage"], 4),
                "background_pixel_count": damage_result["background_pixels"],
                "healthy_wheat_pixel_count": damage_result["healthy_crop_pixels"],
                "damaged_wheat_pixel_count": damage_result["damaged_crop_pixels"],
                "total_crop_pixels": damage_result["total_crop_pixels"],
                "total_image_pixels": damage_result["total_pixels"],
                "class_distribution": damage_result["class_distribution"],
                "mask_url": mask_url,
                "overlay_url": overlay_url,
            }
        )

    total_healthy = sum(r["healthy_wheat_pixel_count"] for r in individual_results)
    total_damaged = sum(r["damaged_wheat_pixel_count"] for r in individual_results)
    total_crop = total_healthy + total_damaged

    overall_crop_weighted_damage = (
        (100.0 * total_damaged / total_crop) if total_crop > 0 else 0.0
    )
    mean_damage_percentage = (
        sum(r["damage_percentage"] for r in individual_results) / len(individual_results)
    )

    return {
        "message": (
            "Multiple field images were processed "
            "and visible damage estimation completed successfully."
        ),
        "prediction_status": "completed",
        "total_images": image_count,
        "individual_results": individual_results,
        "overall_damage_analysis": {
            "status": "completed",
            "model": "residual_unet",
            "model_checkpoint": "ml/damage_segmentation/models/production/best.keras",
            "input_size": [256, 256],
            "total_healthy_crop_pixels": total_healthy,
            "total_damaged_crop_pixels": total_damaged,
            "total_crop_pixels": total_crop,
            "overall_damage_percentage": round(overall_crop_weighted_damage, 4),
            "overall_crop_weighted_damage_percentage": round(overall_crop_weighted_damage, 4),
            "mean_damage_percentage": round(mean_damage_percentage, 4),
            "aggregation_method": (
                "Crop-pixel weighted damage percentage across submitted field images "
                "(sum(damaged_crop_pixels) / sum(total_crop_pixels) * 100)"
            ),
        },
        "verification": {
            "status": "Officer validation required",
            "note": (
                "The visible damage percentage is an AI-based decision-support "
                "estimate. Final crop-insurance claim verification must be "
                "performed by an authorized officer."
            ),
        },
    }


# ============================================================
# TIME-SERIES FIELD OBSERVATION ENDPOINTS
# ============================================================

from app.services.observation_repository import (
    create_observation,
    add_observation_images,
    update_observation_status,
    save_observation_ai_results,
    get_observation,
    get_farm_observations,
    get_farm_timeline,
    generate_observation_code,
)


def _parse_list_field(field_val: Any) -> list[str]:
    """Parse list parameters from multipart form fields or comma-separated strings."""
    if isinstance(field_val, list):
        items = []
        for item in field_val:
            if isinstance(item, str) and "," in item:
                items.extend([x.strip() for x in item.split(",") if x.strip()])
            elif isinstance(item, str):
                items.append(item.strip())
        return items
    elif isinstance(field_val, str):
        return [x.strip() for x in field_val.split(",") if x.strip()]
    return []


@app.post("/api/observations", summary="Create Time-Series Farm Observation")
@app.post("/observations", summary="Create Time-Series Farm Observation")
async def api_create_observation(
    farm_id: str = Form(...),
    farmer_id: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    gps_accuracy: float = Form(5.0),
    gps_source: str = Form("browser"),
    observation_date: str | None = Form(None),
    files: list[UploadFile] = File(...),
    zones: Any = Form(...),
    image_types: Any = Form(...),

) -> dict:
    """
    Create a complete 10-image time-series field observation for a registered farm.

    Validation Rules:
    - Farm ownership verification (farmer_id must own farm_id).
    - Requires 10 images total: 5 close-up and 5 field-view.
    - Requires 5 observation zones (zone_1 to zone_5).
    - Each zone requires exactly 1 close-up and 1 field-view image.

    Lifecycle States:
    uploading -> complete -> analyzing -> analyzed -> finalized (or failed)
    """
    # 1. Farm Ownership & Authorization Check
    farm = get_farm_by_id(farm_id)
    if not farm:
        raise HTTPException(status_code=404, detail="Selected farm plot not found.")

    farmer = get_farmer_by_code(farmer_id) or get_farmer_by_mobile(farmer_id)
    target_farmer_id = farmer["id"] if farmer else farmer_id
    target_farmer_code = farmer["farmer_code"] if farmer else farmer_id

    farm_owner_id = str(farm.get("farmer_id"))
    if farm_owner_id != str(target_farmer_id) and farm_owner_id != str(target_farmer_code):
        raise HTTPException(
            status_code=403,
            detail="Unauthorized: Farm plot does not belong to the authenticated farmer."
        )

    # 2. Parse & Validate Image Protocol & Zone Parameters
    parsed_zones = _parse_list_field(zones)
    parsed_types = _parse_list_field(image_types)

    if len(files) != 10:
        raise HTTPException(
            status_code=400,
            detail=f"Observation requires 10 images (5 close-up and 5 field-view). Received {len(files)} images."
        )

    if len(parsed_zones) != 10 or len(parsed_types) != 10:
        raise HTTPException(
            status_code=400,
            detail="Observation requires 10 images, each specifying an observation_zone (zone_1..zone_5) and image_type (close_up/field_view)."
        )

    valid_zones = {"zone_1", "zone_2", "zone_3", "zone_4", "zone_5"}
    valid_types = {"close_up", "field_view"}

    close_ups_by_zone: dict[str, int] = {}
    field_views_by_zone: dict[str, int] = {}

    for idx, (z, t) in enumerate(zip(parsed_zones, parsed_types)):
        if z not in valid_zones:
            raise HTTPException(status_code=400, detail=f"Invalid observation zone '{z}'. Must be zone_1, zone_2, zone_3, zone_4, or zone_5.")
        if t not in valid_types:
            raise HTTPException(status_code=400, detail=f"Invalid image type '{t}'. Must be 'close_up' or 'field_view'.")

        if t == "close_up":
            if z in close_ups_by_zone:
                raise HTTPException(status_code=400, detail=f"Duplicate close-up image for {z}. Each zone requires exactly one close-up image.")
            close_ups_by_zone[z] = idx
        elif t == "field_view":
            if z in field_views_by_zone:
                raise HTTPException(status_code=400, detail=f"Duplicate field-view image for {z}. Each zone requires exactly one field-view image.")
            field_views_by_zone[z] = idx

    for z in valid_zones:
        if z not in close_ups_by_zone:
            raise HTTPException(status_code=400, detail=f"Observation requires 5 close-up and 5 field-view images. Missing close-up image for {z}.")
        if z not in field_views_by_zone:
            raise HTTPException(status_code=400, detail=f"Observation requires 5 close-up and 5 field-view images. Missing field-view image for {z}.")

    # 3. Create Initial Observation Record (State: 'complete' uploaded)
    obs_record = create_observation({
        "farm_id": farm["id"],
        "farmer_id": target_farmer_id,
        "latitude": latitude,
        "longitude": longitude,
        "gps_accuracy": gps_accuracy,
        "gps_source": gps_source,
        "status": "complete",
        "image_count": 10,
        "close_up_count": 5,
        "field_view_count": 5,
        "observation_date": observation_date,
    })
    obs_id = obs_record["id"]

    # 4. Save Image Files & Build Image Metadata
    obs_dir = UPLOAD_FOLDER / "observations" / obs_id
    obs_dir.mkdir(parents=True, exist_ok=True)

    image_records = []
    saved_file_paths = []

    for idx, (file, zone, img_type) in enumerate(zip(files, parsed_zones, parsed_types)):
        content = await file.read()
        validate_image_file(file, content)

        ext = Path(file.filename or "image.jpg").suffix.lower() or ".jpg"
        filename = f"{zone}_{img_type}_{idx+1}{ext}"
        saved_path = obs_dir / filename
        saved_path.write_bytes(content)

        rel_path = f"/uploads/observations/{obs_id}/{filename}"
        saved_file_paths.append((saved_path, zone, img_type, file.filename or filename))

        image_records.append({
            "observation_id": obs_id,
            "image_path": rel_path,
            "image_type": img_type,
            "observation_zone": zone,
            "original_filename": file.filename or filename,
        })

    saved_images = add_observation_images(obs_id, image_records)

    # 5. Execute AI Inference Pipeline (State Transition: 'analyzing')
    update_observation_status(obs_id, "analyzing")

    try:
        close_up_predictions = []
        field_damage_results = []
        updated_image_metas = []

        for (path, zone, img_type, orig_name), img_rec in zip(saved_file_paths, saved_images):
            img_id = img_rec["id"]
            if img_type == "close_up":
                dis_res = predict_image(path)
                close_up_predictions.append(dis_res)
                updated_image_metas.append({
                    "id": img_id,
                    "disease_prediction": dis_res,
                })
            elif img_type == "field_view":
                output_name = f"obs_{obs_id[:8]}_{zone}_{img_type}"
                dmg_res = predict_damage(str(path), output_name=output_name)
                field_damage_results.append(dmg_res)
                updated_image_metas.append({
                    "id": img_id,
                    "damage_prediction": {
                        "damage_percentage": dmg_res["damage_percentage"],
                        "damaged_pixels": dmg_res["damaged_pixels"],
                        "healthy_pixels": dmg_res["healthy_crop_pixels"],
                        "background_pixels": dmg_res["background_pixels"],
                        "mask_path": dmg_res["mask_path"],
                        "overlay_path": dmg_res["overlay_path"],
                    },
                })

        # 6. Aggregate AI Predictions
        disease_agg = aggregate_predictions(close_up_predictions)
        final_disease = disease_agg.get("final_result", "Healthy")
        disease_confidence = disease_agg.get("confidence", 85.0)

        # Calculate crop-weighted average damage percentage across 5 field-view images
        total_damaged_px = sum(r["damaged_pixels"] for r in field_damage_results)
        total_healthy_px = sum(r["healthy_crop_pixels"] for r in field_damage_results)
        total_crop_px = total_damaged_px + total_healthy_px

        if total_crop_px > 0:
            overall_damage_pct = round(100.0 * total_damaged_px / total_crop_px, 2)
        else:
            overall_damage_pct = round(
                sum(r["damage_percentage"] for r in field_damage_results) / len(field_damage_results), 2
            ) if field_damage_results else 0.0

        # 7. Compute Transparent 100-Point Evidence Score
        dist_km = calculate_geographic_distance(
            float(farm.get("latitude", 0.0)), float(farm.get("longitude", 0.0)),
            latitude, longitude
        )

        supporting_cnt = disease_agg.get("supporting_images", 5)
        if isinstance(supporting_cnt, (list, tuple)):
            supporting_cnt = len(supporting_cnt)

        mock_claim_evidence = {
            "disease_analysis": {
                "final_prediction": final_disease,
                "overall_confidence": disease_confidence,
                "total_images": 5,
                "supporting_images": supporting_cnt,
            },
            "location_evidence": {
                "distance_km": dist_km,
                "gps_captured": True,
            },
            "close_up_images": [1, 2, 3, 4, 5],
            "field_images": [1, 2, 3, 4, 5],
            "damage_analysis": {
                "overall_damage_percentage": overall_damage_pct,
                "total_crop_pixels": total_crop_px,
            },
            "exif_metadata": {"has_gps": True, "has_timestamp": True},
        }

        score_res = calculate_evidence_score(mock_claim_evidence)
        evidence_score = score_res["total_score"]

        # 8. Finalize Observation Record
        save_observation_ai_results(
            obs_id,
            disease_result=final_disease,
            disease_confidence=disease_confidence,
            damage_percentage=overall_damage_pct,
            evidence_score=evidence_score,
            image_results=updated_image_metas,
            status="finalized",
        )

        finalized_obs = get_observation(obs_id)
        return {
            "message": "Time-series field observation created and AI analysis finalized successfully.",
            "observation": finalized_obs,
            "evidence_score_breakdown": score_res,
            "gps_distance_from_farm_km": dist_km,
        }

    except Exception as err:
        print(f"[ObservationAPI] AI processing failed for observation {obs_id}: {err}")
        # Preserve uploaded files and mark state as 'failed'
        update_observation_status(obs_id, "failed")
        unfinalized_obs = get_observation(obs_id)
        return {
            "message": f"Observation images saved, but AI analysis encountered an issue: {err}",
            "observation": unfinalized_obs,
            "status": "failed",
        }


@app.get("/api/observations/{observation_id}", summary="Get Observation Details")
@app.get("/observations/{observation_id}", summary="Get Observation Details")
def api_get_observation(observation_id: str) -> dict:
    """Return single observation record with full 10-image breakdown."""
    obs = get_observation(observation_id)
    if not obs:
        raise HTTPException(status_code=404, detail="Observation record not found.")
    return obs


@app.get("/api/farms/{farm_id}/observations", summary="List Observations for a Farm Plot")
@app.get("/farms/{farm_id}/observations", summary="List Observations for a Farm Plot")
def api_get_farm_observations(farm_id: str) -> dict:
    """Return list of observations for a farm plot sorted chronologically."""
    observations = get_farm_observations(farm_id)
    return {
        "farm_id": farm_id,
        "total_observations": len(observations),
        "observations": observations,
    }


@app.get("/api/farms/{farm_id}/observations/timeline", summary="Get Farm Time-Series Timeline")
@app.get("/farms/{farm_id}/observations/timeline", summary="Get Farm Time-Series Timeline")
def api_get_farm_timeline(farm_id: str) -> dict:
    """Return complete farm time-series timeline with consecutive observation comparison deltas."""
    timeline = get_farm_timeline(farm_id)
    return timeline


@app.get("/api/observations/{observation_id}/images", summary="List Observation Images")
@app.get("/observations/{observation_id}/images", summary="List Observation Images")
def api_get_observation_images(observation_id: str) -> dict:
    """Return 10 observation images for an observation."""
    obs = get_observation(observation_id)
    if not obs:
        raise HTTPException(status_code=404, detail="Observation record not found.")
    return {
        "observation_id": obs["id"],
        "observation_code": obs["observation_code"],
        "image_count": len(obs.get("images", [])),
        "images": obs.get("images", []),
    }

