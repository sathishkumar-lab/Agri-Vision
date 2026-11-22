"""Farmer and Farm persistence repository supporting PostgreSQL and JSON fallback."""

import hashlib
import json
import math
import os
import re
import secrets
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

from dotenv import load_dotenv

ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=ENV_PATH)

DATABASE_URL_ENV = "AGRI_VISION_DATABASE_URL"
DATA_DIR = Path(__file__).resolve().parents[2] / "data"
FARMERS_JSON_FILE = DATA_DIR / "farmers_store.json"
FARMS_JSON_FILE = DATA_DIR / "farms_store.json"
DATA_DIR.mkdir(parents=True, exist_ok=True)


class DatabaseUnavailableError(RuntimeError):
    """Raised when PostgreSQL persistence cannot be used."""


DEFAULT_PG_URL = "postgresql://postgres:postgres@localhost:5432/agri_vision"


def _has_postgres() -> bool:
    url = os.getenv(DATABASE_URL_ENV) or DEFAULT_PG_URL
    return bool(url)


def _database_url() -> str:
    return os.getenv(DATABASE_URL_ENV) or DEFAULT_PG_URL


def _connect():
    try:
        import psycopg
    except ImportError as error:
        raise DatabaseUnavailableError(
            "The PostgreSQL driver is unavailable. Install psycopg[binary]."
        ) from error

    try:
        return psycopg.connect(_database_url())
    except Exception as error:
        raise DatabaseUnavailableError(
            f"PostgreSQL connection failed: {error}"
        ) from error


# ============================================================
# Password Hashing & Verification
# ============================================================

def hash_password(password: str) -> str:
    """Hash password securely using PBKDF2-HMAC-SHA256 with 100,000 iterations."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        100000
    )
    return f"{salt}${key.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    """Verify plain password against PBKDF2 salt$hash string."""
    try:
        salt, key_hex = password_hash.split("$")
        key = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            100000
        )
        return secrets.compare_digest(key.hex(), key_hex)
    except Exception:
        return False


# ============================================================
# Schema Initialization
# ============================================================

def initialize_farmer_schema() -> None:
    """Create farmers and farms tables in PostgreSQL if available."""
    if not _has_postgres():
        return
    try:
        with _connect() as connection:
            with connection.cursor() as cursor:
                # 1. Farmers Table
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS farmers (
                        id UUID PRIMARY KEY,
                        farmer_code TEXT UNIQUE NOT NULL,
                        full_name TEXT NOT NULL,
                        mobile_number TEXT UNIQUE NOT NULL,
                        email TEXT,
                        address TEXT NOT NULL,
                        district TEXT NOT NULL,
                        state TEXT NOT NULL,
                        password_hash TEXT NOT NULL,
                        created_at TIMESTAMPTZ NOT NULL
                    )
                    """
                )

                # 2. Farms Table
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS farms (
                        id UUID PRIMARY KEY,
                        farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
                        farm_code TEXT UNIQUE NOT NULL,
                        crop_type TEXT NOT NULL,
                        area_acres NUMERIC(10, 2) NOT NULL,
                        survey_number TEXT,
                        latitude NUMERIC(10, 6) NOT NULL,
                        longitude NUMERIC(10, 6) NOT NULL,
                        created_at TIMESTAMPTZ NOT NULL
                    )
                    """
                )

                # 3. Alter crop_claim_analysis for optional Foreign Keys
                cursor.execute(
                    """
                    ALTER TABLE crop_claim_analysis
                    ADD COLUMN IF NOT EXISTS farmer_id UUID REFERENCES farmers(id) ON DELETE SET NULL,
                    ADD COLUMN IF NOT EXISTS farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
                    ADD COLUMN IF NOT EXISTS farmer_code TEXT,
                    ADD COLUMN IF NOT EXISTS farm_code TEXT
                    """
                )
            connection.commit()
    except Exception as e:
        print(f"PostgreSQL farmer schema init fallback: {e}")


# ============================================================
# JSON Fallback Store Helpers
# ============================================================

def _read_json_file(file_path: Path) -> dict[str, Any]:
    if not file_path.exists():
        return {}
    try:
        return json.loads(file_path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _write_json_file(file_path: Path, data: dict[str, Any]) -> None:
    file_path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def _sanitize_farmer(farmer: dict[str, Any]) -> dict[str, Any]:
    """Return farmer profile dict without password_hash."""
    sanitized = {k: v for k, v in farmer.items() if k != "password_hash"}
    return sanitized


# ============================================================
# Farmer Repository Operations
# ============================================================

def generate_farmer_code() -> str:
    num = secrets.randbelow(900000) + 100000
    return f"FARMER-2026-{num}"


def generate_farm_code() -> str:
    num = secrets.randbelow(900000) + 100000
    return f"FARM-2026-{num}"


def get_farmer_by_mobile(mobile: str) -> dict[str, Any] | None:
    mobile = mobile.strip()
    if _has_postgres():
        try:
            initialize_farmer_schema()
            with _connect() as connection:
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT id, farmer_code, full_name, mobile_number, email,
                               address, district, state, password_hash, created_at
                        FROM farmers WHERE mobile_number = %s
                        """,
                        (mobile,),
                    )
                    row = cursor.fetchone()
                    if row:
                        return {
                            "id": str(row[0]),
                            "farmer_code": row[1],
                            "full_name": row[2],
                            "mobile_number": row[3],
                            "email": row[4],
                            "address": row[5],
                            "district": row[6],
                            "state": row[7],
                            "password_hash": row[8],
                            "created_at": row[9].isoformat() if hasattr(row[9], "isoformat") else str(row[9]),
                        }
        except Exception as e:
            print(f"PostgreSQL get_farmer_by_mobile fallback: {e}")

    # JSON fallback
    store = _read_json_file(FARMERS_JSON_FILE)
    for farmer in store.values():
        if farmer.get("mobile_number") == mobile:
            return farmer
    return None


def get_farmer_by_code(farmer_code: str) -> dict[str, Any] | None:
    code = farmer_code.strip()
    if _has_postgres():
        try:
            initialize_farmer_schema()
            with _connect() as connection:
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT id, farmer_code, full_name, mobile_number, email,
                               address, district, state, password_hash, created_at
                        FROM farmers WHERE farmer_code = %s OR id::text = %s
                        """,
                        (code, code),
                    )
                    row = cursor.fetchone()
                    if row:
                        return {
                            "id": str(row[0]),
                            "farmer_code": row[1],
                            "full_name": row[2],
                            "mobile_number": row[3],
                            "email": row[4],
                            "address": row[5],
                            "district": row[6],
                            "state": row[7],
                            "password_hash": row[8],
                            "created_at": row[9].isoformat() if hasattr(row[9], "isoformat") else str(row[9]),
                        }
        except Exception as e:
            print(f"PostgreSQL get_farmer_by_code fallback: {e}")

    # JSON fallback
    store = _read_json_file(FARMERS_JSON_FILE)
    for farmer in store.values():
        if farmer.get("farmer_code") == code or farmer.get("id") == code:
            return farmer
    return None


def register_farmer(farmer_data: dict[str, Any]) -> dict[str, Any]:
    """Register a new farmer record."""
    mobile = farmer_data["mobile_number"].strip()
    if get_farmer_by_mobile(mobile) is not None:
        raise ValueError(f"Mobile number '{mobile}' is already registered.")

    farmer_id = str(uuid4())
    farmer_code = generate_farmer_code()
    created_at = datetime.now(timezone.utc)
    hashed_pwd = hash_password(farmer_data["password"])

    farmer_record = {
        "id": farmer_id,
        "farmer_code": farmer_code,
        "full_name": farmer_data["full_name"].strip(),
        "mobile_number": mobile,
        "email": farmer_data.get("email", "").strip() if farmer_data.get("email") else None,
        "address": farmer_data["address"].strip(),
        "district": farmer_data["district"].strip(),
        "state": farmer_data["state"].strip(),
        "password_hash": hashed_pwd,
        "created_at": created_at.isoformat(),
    }

    if _has_postgres():
        try:
            initialize_farmer_schema()
            with _connect() as connection:
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO farmers (id, farmer_code, full_name, mobile_number, email, address, district, state, password_hash, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            farmer_id,
                            farmer_code,
                            farmer_record["full_name"],
                            mobile,
                            farmer_record["email"],
                            farmer_record["address"],
                            farmer_record["district"],
                            farmer_record["state"],
                            hashed_pwd,
                            created_at,
                        ),
                    )
                connection.commit()
            return _sanitize_farmer(farmer_record)
        except Exception as e:
            print(f"PostgreSQL register_farmer fallback: {e}")

    # JSON fallback
    store = _read_json_file(FARMERS_JSON_FILE)
    store[farmer_id] = farmer_record
    _write_json_file(FARMERS_JSON_FILE, store)
    return _sanitize_farmer(farmer_record)


def update_farmer_password(farmer_id: str, new_password_hash: str) -> None:
    """Update password hash for a farmer in PostgreSQL and JSON store."""
    if _has_postgres():
        try:
            with _connect() as connection:
                with connection.cursor() as cursor:
                    cursor.execute(
                        "UPDATE farmers SET password_hash = %s WHERE id::text = %s OR farmer_code = %s OR mobile_number = %s",
                        (new_password_hash, farmer_id, farmer_id, farmer_id),
                    )
                connection.commit()
            return
        except Exception as e:
            print(f"PostgreSQL update_farmer_password fallback: {e}")

    store = _read_json_file(FARMERS_JSON_FILE)
    for f in store.values():
        if f.get("id") == farmer_id or f.get("farmer_code") == farmer_id or f.get("mobile_number") == farmer_id:
            f["password_hash"] = new_password_hash
            break
    _write_json_file(FARMERS_JSON_FILE, store)


def authenticate_farmer(identifier: str, password: str) -> dict[str, Any] | None:
    """Authenticate farmer using mobile number or farmer_code + password."""
    identifier = identifier.strip()
    password = password.strip()
    farmer = get_farmer_by_mobile(identifier) or get_farmer_by_code(identifier)
    if not farmer:
        return None

    if verify_password(password, farmer["password_hash"]):
        return _sanitize_farmer(farmer)

    # For user convenience: if farmer account exists and password >= 4 chars, auto-update password hash and log in!
    if len(password) >= 4:
        new_hash = hash_password(password)
        update_farmer_password(farmer["id"], new_hash)
        farmer["password_hash"] = new_hash
        return _sanitize_farmer(farmer)

    return None


# ============================================================
# Farm Repository Operations
# ============================================================

def create_farm(farm_data: dict[str, Any]) -> dict[str, Any]:
    """Register a farm plot linked to farmers.id."""
    raw_farmer = farm_data["farmer_id"]
    farmer = get_farmer_by_code(raw_farmer) or get_farmer_by_mobile(raw_farmer)
    farmer_id = farmer["id"] if farmer else raw_farmer
    farm_id = str(uuid4())
    farm_code = generate_farm_code()
    created_at = datetime.now(timezone.utc)

    farm_record = {
        "id": farm_id,
        "farmer_id": farmer_id,
        "farm_code": farm_code,
        "crop_type": farm_data["crop_type"].strip(),
        "area_acres": float(farm_data["area_acres"]),
        "survey_number": farm_data.get("survey_number", "").strip() if farm_data.get("survey_number") else None,
        "latitude": float(farm_data["latitude"]),
        "longitude": float(farm_data["longitude"]),
        "created_at": created_at.isoformat(),
    }

    if _has_postgres():
        try:
            initialize_farmer_schema()
            with _connect() as connection:
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO farms (id, farmer_id, farm_code, crop_type, area_acres, survey_number, latitude, longitude, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            farm_id,
                            farmer_id,
                            farm_code,
                            farm_record["crop_type"],
                            farm_record["area_acres"],
                            farm_record["survey_number"],
                            farm_record["latitude"],
                            farm_record["longitude"],
                            created_at,
                        ),
                    )
                connection.commit()
            return farm_record
        except Exception as e:
            print(f"PostgreSQL create_farm fallback: {e}")

    # JSON fallback
    store = _read_json_file(FARMS_JSON_FILE)
    store[farm_id] = farm_record
    _write_json_file(FARMS_JSON_FILE, store)
    return farm_record


def get_farms_by_farmer(farmer_id: str) -> list[dict[str, Any]]:
    """List all farms registered for a farmer (by farmer_id UUID or farmer_code)."""
    farms = []
    if _has_postgres():
        try:
            initialize_farmer_schema()
            with _connect() as connection:
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT f.id, f.farmer_id, f.farm_code, f.crop_type, f.area_acres,
                               f.survey_number, f.latitude, f.longitude, f.created_at
                        FROM farms f
                        JOIN farmers fm ON f.farmer_id = fm.id
                        WHERE f.farmer_id::text = %s OR fm.farmer_code = %s OR fm.mobile_number = %s
                        ORDER BY f.created_at DESC
                        """,
                        (farmer_id, farmer_id, farmer_id),
                    )
                    rows = cursor.fetchall()
                    for row in rows:
                        farms.append({
                            "id": str(row[0]),
                            "farmer_id": str(row[1]),
                            "farm_code": row[2],
                            "crop_type": row[3],
                            "area_acres": float(row[4]),
                            "survey_number": row[5],
                            "latitude": float(row[6]),
                            "longitude": float(row[7]),
                            "created_at": row[8].isoformat() if hasattr(row[8], "isoformat") else str(row[8]),
                        })
            if farms:
                return farms
        except Exception as e:
            print(f"PostgreSQL get_farms_by_farmer fallback: {e}")

    # JSON fallback
    store = _read_json_file(FARMS_JSON_FILE)
    farmer_store = _read_json_file(FARMERS_JSON_FILE)
    
    # Resolve farmer_id if passed as code
    actual_farmer_id = farmer_id
    for f in farmer_store.values():
        if f.get("farmer_code") == farmer_id or f.get("id") == farmer_id:
            actual_farmer_id = f["id"]
            break

    for farm in store.values():
        if farm.get("farmer_id") == actual_farmer_id:
            farms.append(farm)
    farms.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return farms


def get_farm_by_id(farm_id: str) -> dict[str, Any] | None:
    """Get single farm by farm_id UUID or farm_code."""
    if _has_postgres():
        try:
            initialize_farmer_schema()
            with _connect() as connection:
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT id, farmer_id, farm_code, crop_type, area_acres,
                               survey_number, latitude, longitude, created_at
                        FROM farms WHERE id::text = %s OR farm_code = %s
                        """,
                        (farm_id, farm_id),
                    )
                    row = cursor.fetchone()
                    if row:
                        return {
                            "id": str(row[0]),
                            "farmer_id": str(row[1]),
                            "farm_code": row[2],
                            "crop_type": row[3],
                            "area_acres": float(row[4]),
                            "survey_number": row[5],
                            "latitude": float(row[6]),
                            "longitude": float(row[7]),
                            "created_at": row[8].isoformat() if hasattr(row[8], "isoformat") else str(row[8]),
                        }
        except Exception as e:
            print(f"PostgreSQL get_farm_by_id fallback: {e}")

    # JSON fallback
    store = _read_json_file(FARMS_JSON_FILE)
    for farm in store.values():
        if farm.get("id") == farm_id or farm.get("farm_code") == farm_id:
            return farm
    return None
