"""PostgreSQL and JSON fallback persistence for Time-Series Field Observations and Farm Timelines."""

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

from app.services.claim_repository import (
    DatabaseUnavailableError,
    _connect,
    _database_url,
    _has_postgres,
    calculate_geographic_distance,
)

logger = logging.getLogger("agri_vision.observation_repository")

from dotenv import load_dotenv

ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=ENV_PATH)

DATABASE_URL_ENV = "AGRI_VISION_DATABASE_URL"
DATA_DIR = Path(__file__).resolve().parents[2] / "data"
OBSERVATIONS_JSON_FILE = DATA_DIR / "observations_store.json"
OBSERVATION_IMAGES_JSON_FILE = DATA_DIR / "observation_images_store.json"
DATA_DIR.mkdir(parents=True, exist_ok=True)


# ============================================================
# Schema Initialization
# ============================================================

def initialize_observation_schema() -> None:
    """Create observations and observation_images tables in PostgreSQL if available."""
    if not _has_postgres():
        logger.info("[ObservationRepository] PostgreSQL not configured. Using JSON fallback store.")
        return

    try:
        with _connect() as connection:
            with connection.cursor() as cursor:
                # 1. Observations Table
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS observations (
                        id UUID PRIMARY KEY,
                        farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
                        farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
                        observation_code TEXT UNIQUE NOT NULL,
                        observation_date TIMESTAMPTZ NOT NULL,
                        latitude NUMERIC(10, 6) NOT NULL,
                        longitude NUMERIC(10, 6) NOT NULL,
                        gps_accuracy NUMERIC(10, 2) DEFAULT 5.0,
                        gps_source TEXT DEFAULT 'browser',
                        status TEXT NOT NULL DEFAULT 'uploading',
                        image_count INT DEFAULT 0,
                        close_up_count INT DEFAULT 0,
                        field_view_count INT DEFAULT 0,
                        disease_result TEXT,
                        disease_confidence NUMERIC(5, 2),
                        damage_percentage NUMERIC(5, 2),
                        evidence_score INT,
                        created_at TIMESTAMPTZ NOT NULL,
                        updated_at TIMESTAMPTZ NOT NULL,
                        finalized_at TIMESTAMPTZ
                    )
                    """
                )

                cursor.execute(
                    "CREATE INDEX IF NOT EXISTS idx_observations_farm_id ON observations(farm_id)"
                )
                cursor.execute(
                    "CREATE INDEX IF NOT EXISTS idx_observations_date ON observations(observation_date)"
                )

                # 2. Observation Images Table
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS observation_images (
                        id UUID PRIMARY KEY,
                        observation_id UUID NOT NULL REFERENCES observations(id) ON DELETE CASCADE,
                        image_path TEXT NOT NULL,
                        image_type TEXT NOT NULL,
                        observation_zone TEXT NOT NULL,
                        original_filename TEXT NOT NULL,
                        uploaded_at TIMESTAMPTZ NOT NULL,
                        disease_prediction JSONB,
                        damage_prediction JSONB
                    )
                    """
                )

                cursor.execute(
                    "CREATE INDEX IF NOT EXISTS idx_obs_images_obs_id ON observation_images(observation_id)"
                )

                # 3. Add optional observation_id & observation_code to crop_claim_analysis table
                cursor.execute(
                    """
                    ALTER TABLE crop_claim_analysis
                    ADD COLUMN IF NOT EXISTS observation_id UUID REFERENCES observations(id) ON DELETE SET NULL,
                    ADD COLUMN IF NOT EXISTS observation_code TEXT
                    """
                )

            connection.commit()
            logger.info("[ObservationRepository] PostgreSQL schema initialized successfully.")
    except Exception as e:
        logger.warning(f"[ObservationRepository] PostgreSQL schema init fallback: {e}")


# ============================================================
# JSON Fallback Store Helpers
# ============================================================

def _load_json_store(file_path: Path) -> list[dict[str, Any]]:
    if not file_path.exists():
        return []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return data
            elif isinstance(data, dict):
                return [v for v in data.values() if isinstance(v, dict)]
            return []
    except Exception as e:
        logger.error(f"[ObservationRepository] Failed loading JSON store {file_path}: {e}")
        return []


def _save_json_store(file_path: Path, data: list[dict[str, Any]]) -> None:
    try:
        file_path.parent.mkdir(parents=True, exist_ok=True)
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=str)
    except Exception as e:
        logger.error(f"[ObservationRepository] Failed saving JSON store {file_path}: {e}")


# ============================================================
# Observation Code Generator
# ============================================================

def generate_observation_code() -> str:
    """Generate sequential human-readable observation code (e.g. OBS-2026-0001)."""
    current_year = datetime.now(timezone.utc).year

    if _has_postgres():
        try:
            with _connect() as conn:
                with conn.cursor() as cur:
                    prefix = f"OBS-{current_year}-%"
                    cur.execute(
                        "SELECT COUNT(*) FROM observations WHERE observation_code LIKE %s",
                        (prefix,),
                    )
                    count = cur.fetchone()[0]
                    return f"OBS-{current_year}-{(count + 1):04d}"
        except Exception as e:
            logger.warning(f"[ObservationRepository] DB code generation fallback: {e}")

    # Fallback to JSON store count
    observations = _load_json_store(OBSERVATIONS_JSON_FILE)
    prefix = f"OBS-{current_year}-"
    year_obs = [o for o in observations if str(o.get("observation_code", "")).startswith(prefix)]
    return f"OBS-{current_year}-{(len(year_obs) + 1):04d}"


# ============================================================
# CRUD & Processing Operations
# ============================================================

def create_observation(obs_data: dict[str, Any]) -> dict[str, Any]:
    """
    Create a new observation record.
    Status starts at 'uploading' or 'complete'.
    """
    now = datetime.now(timezone.utc)

    obs_id = str(obs_data.get("id") or uuid4())
    observation_code = obs_data.get("observation_code") or generate_observation_code()
    created_at = obs_data.get("created_at") or now.isoformat()
    observation_date = obs_data.get("observation_date") or created_at

    record = {
        "id": obs_id,
        "farm_id": str(obs_data["farm_id"]),
        "farmer_id": str(obs_data["farmer_id"]),
        "observation_code": observation_code,
        "observation_date": observation_date,
        "latitude": float(obs_data.get("latitude", 0.0)),
        "longitude": float(obs_data.get("longitude", 0.0)),
        "gps_accuracy": float(obs_data.get("gps_accuracy", 5.0)),
        "gps_source": str(obs_data.get("gps_source", "browser")),
        "status": str(obs_data.get("status", "uploading")),
        "image_count": int(obs_data.get("image_count", 0)),
        "close_up_count": int(obs_data.get("close_up_count", 0)),
        "field_view_count": int(obs_data.get("field_view_count", 0)),
        "disease_result": obs_data.get("disease_result"),
        "disease_confidence": float(obs_data["disease_confidence"]) if obs_data.get("disease_confidence") is not None else None,
        "damage_percentage": float(obs_data["damage_percentage"]) if obs_data.get("damage_percentage") is not None else None,
        "evidence_score": int(obs_data["evidence_score"]) if obs_data.get("evidence_score") is not None else None,
        "created_at": created_at,
        "updated_at": now.isoformat(),
        "finalized_at": obs_data.get("finalized_at"),
    }

    if _has_postgres():
        try:
            with _connect() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO observations (
                            id, farm_id, farmer_id, observation_code, observation_date,
                            latitude, longitude, gps_accuracy, gps_source, status,
                            image_count, close_up_count, field_view_count,
                            disease_result, disease_confidence, damage_percentage, evidence_score,
                            created_at, updated_at, finalized_at
                        ) VALUES (
                            %s, %s, %s, %s, %s,
                            %s, %s, %s, %s, %s,
                            %s, %s, %s,
                            %s, %s, %s, %s,
                            %s, %s, %s
                        )
                        """,
                        (
                            record["id"], record["farm_id"], record["farmer_id"], record["observation_code"], record["observation_date"],
                            record["latitude"], record["longitude"], record["gps_accuracy"], record["gps_source"], record["status"],
                            record["image_count"], record["close_up_count"], record["field_view_count"],
                            record["disease_result"], record["disease_confidence"], record["damage_percentage"], record["evidence_score"],
                            record["created_at"], record["updated_at"], record["finalized_at"],
                        ),
                    )
                conn.commit()
            return record
        except Exception as e:
            logger.warning(f"[ObservationRepository] DB create_observation fallback to JSON: {e}")

    # Fallback to JSON store
    observations = _load_json_store(OBSERVATIONS_JSON_FILE)
    observations = [o for o in observations if o.get("id") != obs_id]
    observations.append(record)
    _save_json_store(OBSERVATIONS_JSON_FILE, observations)
    return record


def add_observation_images(observation_id: str, image_records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Save image metadata records linked to an observation."""
    now = datetime.now(timezone.utc).isoformat()
    saved_records = []

    for img in image_records:
        rec = {
            "id": str(img.get("id") or uuid4()),
            "observation_id": str(observation_id),
            "image_path": str(img["image_path"]),
            "image_type": str(img["image_type"]),
            "observation_zone": str(img["observation_zone"]),
            "original_filename": str(img.get("original_filename", "image.jpg")),
            "uploaded_at": str(img.get("uploaded_at") or now),
            "disease_prediction": img.get("disease_prediction"),
            "damage_prediction": img.get("damage_prediction"),
        }
        saved_records.append(rec)

    if _has_postgres():
        try:
            with _connect() as conn:
                with conn.cursor() as cur:
                    for rec in saved_records:
                        disease_json = json.dumps(rec["disease_prediction"]) if rec["disease_prediction"] else None
                        damage_json = json.dumps(rec["damage_prediction"]) if rec["damage_prediction"] else None
                        cur.execute(
                            """
                            INSERT INTO observation_images (
                                id, observation_id, image_path, image_type, observation_zone,
                                original_filename, uploaded_at, disease_prediction, damage_prediction
                            ) VALUES (
                                %s, %s, %s, %s, %s, %s, %s, %s, %s
                            )
                            """,
                            (
                                rec["id"], rec["observation_id"], rec["image_path"], rec["image_type"], rec["observation_zone"],
                                rec["original_filename"], rec["uploaded_at"], disease_json, damage_json,
                            ),
                        )
                conn.commit()
            return saved_records
        except Exception as e:
            logger.warning(f"[ObservationRepository] DB add_observation_images fallback to JSON: {e}")

    # Fallback to JSON store
    all_images = _load_json_store(OBSERVATION_IMAGES_JSON_FILE)
    all_images.extend(saved_records)
    _save_json_store(OBSERVATION_IMAGES_JSON_FILE, all_images)
    return saved_records


def update_observation_status(observation_id: str, status: str) -> None:
    """Update observation status (e.g. uploading -> complete -> analyzing -> analyzed -> finalized / failed)."""
    now = datetime.now(timezone.utc).isoformat()
    finalized_at = now if status == "finalized" else None

    if _has_postgres():
        try:
            with _connect() as conn:
                with conn.cursor() as cur:
                    if finalized_at:
                        cur.execute(
                            "UPDATE observations SET status = %s, updated_at = %s, finalized_at = %s WHERE id = %s",
                            (status, now, finalized_at, observation_id),
                        )
                    else:
                        cur.execute(
                            "UPDATE observations SET status = %s, updated_at = %s WHERE id = %s",
                            (status, now, observation_id),
                        )
                conn.commit()
            return
        except Exception as e:
            logger.warning(f"[ObservationRepository] DB update_observation_status fallback: {e}")

    # JSON Fallback
    observations = _load_json_store(OBSERVATIONS_JSON_FILE)
    for obs in observations:
        if str(obs.get("id")) == str(observation_id):
            obs["status"] = status
            obs["updated_at"] = now
            if finalized_at:
                obs["finalized_at"] = finalized_at
            break
    _save_json_store(OBSERVATIONS_JSON_FILE, observations)


def save_observation_ai_results(
    observation_id: str,
    disease_result: str,
    disease_confidence: float,
    damage_percentage: float,
    evidence_score: int,
    image_results: list[dict[str, Any]] | None = None,
    status: str = "finalized",
) -> None:
    """Save aggregated AI inference results and update state to finalized (or analyzed)."""
    now = datetime.now(timezone.utc).isoformat()
    finalized_at = now if status == "finalized" else None

    if _has_postgres():
        try:
            with _connect() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE observations
                        SET disease_result = %s,
                            disease_confidence = %s,
                            damage_percentage = %s,
                            evidence_score = %s,
                            status = %s,
                            updated_at = %s,
                            finalized_at = COALESCE(%s, finalized_at)
                        WHERE id = %s
                        """,
                        (
                            disease_result, disease_confidence, damage_percentage, evidence_score,
                            status, now, finalized_at, observation_id
                        ),
                    )

                    if image_results:
                        for img in image_results:
                            img_id = img.get("id")
                            if img_id:
                                disease_json = json.dumps(img["disease_prediction"]) if img.get("disease_prediction") else None
                                damage_json = json.dumps(img["damage_prediction"]) if img.get("damage_prediction") else None
                                cur.execute(
                                    """
                                    UPDATE observation_images
                                    SET disease_prediction = COALESCE(%s, disease_prediction),
                                        damage_prediction = COALESCE(%s, damage_prediction)
                                    WHERE id = %s
                                    """,
                                    (disease_json, damage_json, img_id),
                                )
                conn.commit()
            return
        except Exception as e:
            logger.warning(f"[ObservationRepository] DB save_observation_ai_results fallback: {e}")

    # JSON Fallback
    observations = _load_json_store(OBSERVATIONS_JSON_FILE)
    for obs in observations:
        if str(obs.get("id")) == str(observation_id):
            obs["disease_result"] = disease_result
            obs["disease_confidence"] = disease_confidence
            obs["damage_percentage"] = damage_percentage
            obs["evidence_score"] = evidence_score
            obs["status"] = status
            obs["updated_at"] = now
            if finalized_at:
                obs["finalized_at"] = finalized_at
            break
    _save_json_store(OBSERVATIONS_JSON_FILE, observations)

    if image_results:
        all_images = _load_json_store(OBSERVATION_IMAGES_JSON_FILE)
        img_map = {str(i.get("id")): i for i in image_results if i.get("id")}
        for img in all_images:
            if str(img.get("id")) in img_map:
                res = img_map[str(img.get("id"))]
                if "disease_prediction" in res:
                    img["disease_prediction"] = res["disease_prediction"]
                if "damage_prediction" in res:
                    img["damage_prediction"] = res["damage_prediction"]
        _save_json_store(OBSERVATION_IMAGES_JSON_FILE, all_images)


def get_observation(observation_id_or_code: str) -> dict[str, Any] | None:
    """Retrieve observation metadata and its 10 images."""
    record = None
    images = []

    if _has_postgres():
        try:
            with _connect() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT id, farm_id, farmer_id, observation_code, observation_date,
                               latitude, longitude, gps_accuracy, gps_source, status,
                               image_count, close_up_count, field_view_count,
                               disease_result, disease_confidence, damage_percentage, evidence_score,
                               created_at, updated_at, finalized_at
                        FROM observations
                        WHERE id::text = %s OR observation_code = %s
                        """,
                        (str(observation_id_or_code), str(observation_id_or_code)),
                    )
                    row = cur.fetchone()
                    if row:
                        record = {
                            "id": str(row[0]),
                            "farm_id": str(row[1]),
                            "farmer_id": str(row[2]),
                            "observation_code": row[3],
                            "observation_date": str(row[4]),
                            "latitude": float(row[5]),
                            "longitude": float(row[6]),
                            "gps_accuracy": float(row[7]) if row[7] is not None else 5.0,
                            "gps_source": row[8],
                            "status": row[9],
                            "image_count": row[10],
                            "close_up_count": row[11],
                            "field_view_count": row[12],
                            "disease_result": row[13],
                            "disease_confidence": float(row[14]) if row[14] is not None else None,
                            "damage_percentage": float(row[15]) if row[15] is not None else None,
                            "evidence_score": row[16],
                            "created_at": str(row[17]),
                            "updated_at": str(row[18]),
                            "finalized_at": str(row[19]) if row[19] else None,
                        }

                        # Fetch images
                        cur.execute(
                            """
                            SELECT id, observation_id, image_path, image_type, observation_zone,
                                   original_filename, uploaded_at, disease_prediction, damage_prediction
                            FROM observation_images
                            WHERE observation_id = %s
                            ORDER BY observation_zone ASC, image_type ASC
                            """,
                            (record["id"],),
                        )
                        img_rows = cur.fetchall()
                        for img_row in img_rows:
                            disease_pred = img_row[7] if isinstance(img_row[7], dict) else (json.loads(img_row[7]) if img_row[7] else None)
                            damage_pred = img_row[8] if isinstance(img_row[8], dict) else (json.loads(img_row[8]) if img_row[8] else None)
                            images.append({
                                "id": str(img_row[0]),
                                "observation_id": str(img_row[1]),
                                "image_path": img_row[2],
                                "image_type": img_row[3],
                                "observation_zone": img_row[4],
                                "original_filename": img_row[5],
                                "uploaded_at": str(img_row[6]),
                                "disease_prediction": disease_pred,
                                "damage_prediction": damage_pred,
                            })
                        record["images"] = images
                        return record
        except Exception as e:
            logger.warning(f"[ObservationRepository] DB get_observation fallback: {e}")

    # Fallback JSON
    observations = _load_json_store(OBSERVATIONS_JSON_FILE)
    for obs in observations:
        if str(obs.get("id")) == str(observation_id_or_code) or str(obs.get("observation_code")) == str(observation_id_or_code):
            record = dict(obs)
            all_images = _load_json_store(OBSERVATION_IMAGES_JSON_FILE)
            obs_imgs = [i for i in all_images if str(i.get("observation_id")) == str(record["id"])]
            record["images"] = obs_imgs
            return record

    return None


def get_farm_observations(farm_id_or_code: str) -> list[dict[str, Any]]:
    """Retrieve all observations for a farm sorted chronologically by observation_date ASC."""
    # First resolve farm UUID if code was passed
    from app.services.farmer_repository import get_farm_by_id
    farm = get_farm_by_id(farm_id_or_code)
    farm_uuid = farm["id"] if farm else farm_id_or_code

    obs_list = []
    if _has_postgres():
        try:
            with _connect() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT id, farm_id, farmer_id, observation_code, observation_date,
                               latitude, longitude, gps_accuracy, gps_source, status,
                               image_count, close_up_count, field_view_count,
                               disease_result, disease_confidence, damage_percentage, evidence_score,
                               created_at, updated_at, finalized_at
                        FROM observations
                        WHERE farm_id::text = %s OR farm_id::text = %s
                        ORDER BY observation_date ASC
                        """,
                        (str(farm_uuid), str(farm_id_or_code)),
                    )
                    rows = cur.fetchall()
                    for row in rows:
                        obs_list.append({
                            "id": str(row[0]),
                            "farm_id": str(row[1]),
                            "farmer_id": str(row[2]),
                            "observation_code": row[3],
                            "observation_date": str(row[4]),
                            "latitude": float(row[5]),
                            "longitude": float(row[6]),
                            "gps_accuracy": float(row[7]) if row[7] is not None else 5.0,
                            "gps_source": row[8],
                            "status": row[9],
                            "image_count": row[10],
                            "close_up_count": row[11],
                            "field_view_count": row[12],
                            "disease_result": row[13],
                            "disease_confidence": float(row[14]) if row[14] is not None else None,
                            "damage_percentage": float(row[15]) if row[15] is not None else None,
                            "evidence_score": row[16],
                            "created_at": str(row[17]),
                            "updated_at": str(row[18]),
                            "finalized_at": str(row[19]) if row[19] else None,
                        })
                    return obs_list
        except Exception as e:
            logger.warning(f"[ObservationRepository] DB get_farm_observations fallback: {e}")

    # JSON Fallback
    observations = _load_json_store(OBSERVATIONS_JSON_FILE)
    matching = [
        dict(o) for o in observations
        if str(o.get("farm_id")) == str(farm_uuid) or str(o.get("farm_id")) == str(farm_id_or_code)
    ]
    matching.sort(key=lambda x: str(x.get("observation_date", "")))
    return matching


# ============================================================
# Time-Series Timeline & Consecutive Comparison Engine
# ============================================================

def get_farm_timeline(farm_id_or_code: str) -> dict[str, Any]:
    """
    Build complete chronological farm observation timeline with:
    - Farm details
    - Consecutive observation comparison deltas
    - Summary metrics (First vs Latest damage change)
    - Disease status history
    """
    from app.services.farmer_repository import get_farm_by_id
    farm = get_farm_by_id(farm_id_or_code)

    raw_observations = get_farm_observations(farm_id_or_code)
    # Only include finalized/analyzed observations in formal timeline statistics
    valid_observations = [o for o in raw_observations if o.get("status") in ["finalized", "analyzed", "complete"]]

    comparisons = []
    disease_history = []

    for idx, obs in enumerate(valid_observations):
        disease_history.append({
            "observation_id": obs["id"],
            "observation_code": obs["observation_code"],
            "date": obs["observation_date"],
            "disease_result": obs.get("disease_result") or "Unknown",
            "confidence": obs.get("disease_confidence") or 0.0,
        })

        if idx > 0:
            prev = valid_observations[idx - 1]
            prev_damage = prev.get("damage_percentage") or 0.0
            curr_damage = obs.get("damage_percentage") or 0.0
            damage_change = round(curr_damage - prev_damage, 2)

            prev_disease = prev.get("disease_result") or "Unknown"
            curr_disease = obs.get("disease_result") or "Unknown"

            # Calculate distance between consecutive observations or from registered farm location
            farm_lat = float(farm.get("latitude", 0.0)) if farm else float(obs.get("latitude", 0.0))
            farm_lon = float(farm.get("longitude", 0.0)) if farm else float(obs.get("longitude", 0.0))
            gps_distance = calculate_geographic_distance(
                farm_lat, farm_lon,
                obs.get("latitude", 0.0), obs.get("longitude", 0.0)
            )

            prev_score = prev.get("evidence_score") or 0
            curr_score = obs.get("evidence_score") or 0

            comparisons.append({
                "current_observation_id": obs["id"],
                "current_observation_code": obs["observation_code"],
                "current_observation_date": obs["observation_date"],
                "previous_observation_id": prev["id"],
                "previous_observation_code": prev["observation_code"],
                "previous_observation_date": prev["observation_date"],
                "previous_damage_percentage": prev_damage,
                "current_damage_percentage": curr_damage,
                "damage_change_percentage_points": damage_change,
                "previous_disease": prev_disease,
                "current_disease": curr_disease,
                "disease_changed": prev_disease != curr_disease,
                "previous_evidence_score": prev_score,
                "current_evidence_score": curr_score,
                "evidence_score_change": curr_score - prev_score,
                "gps_distance_from_farm_km": gps_distance,
            })

    total_valid = len(valid_observations)
    if total_valid > 0:
        first_obs = valid_observations[0]
        latest_obs = valid_observations[-1]
        first_damage = first_obs.get("damage_percentage") or 0.0
        latest_damage = latest_obs.get("damage_percentage") or 0.0
        overall_damage_change = round(latest_damage - first_damage, 2)
    else:
        first_obs = None
        latest_obs = None
        first_damage = None
        latest_damage = None
        overall_damage_change = None

    return {
        "farm_id": farm.get("id") if farm else farm_id_or_code,
        "farm_code": farm.get("farm_code") if farm else None,
        "crop_type": farm.get("crop_type", "Wheat") if farm else "Wheat",
        "area_acres": farm.get("area_acres", 0.0) if farm else 0.0,
        "survey_number": farm.get("survey_number") if farm else None,
        "farm_latitude": farm.get("latitude") if farm else None,
        "farm_longitude": farm.get("longitude") if farm else None,
        "total_observations": len(raw_observations),
        "valid_observations_count": total_valid,
        "trend_available": total_valid >= 2,
        "first_observation_date": first_obs.get("observation_date") if first_obs else None,
        "latest_observation_date": latest_obs.get("observation_date") if latest_obs else None,
        "first_damage_percentage": first_damage,
        "latest_damage_percentage": latest_damage,
        "overall_damage_change_percentage_points": overall_damage_change,
        "disease_history": disease_history,
        "consecutive_comparisons": comparisons,
        "observations": raw_observations,
    }
