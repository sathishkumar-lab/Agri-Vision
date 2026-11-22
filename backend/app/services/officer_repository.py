"""Field Officer and Insurance Adjuster persistence repository supporting PostgreSQL and JSON fallback."""

import hashlib
import json
import os
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
OFFICERS_JSON_FILE = DATA_DIR / "officers_store.json"
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
# JSON Store Helpers
# ============================================================

def _read_json_store() -> dict[str, dict[str, Any]]:
    if not OFFICERS_JSON_FILE.exists():
        return {}
    try:
        content = OFFICERS_JSON_FILE.read_text(encoding="utf-8")
        if not content.strip():
            return {}
        return json.loads(content)
    except Exception as e:
        print(f"Failed to read officers JSON store: {e}")
        return {}


def _write_json_store(data: dict[str, dict[str, Any]]) -> None:
    OFFICERS_JSON_FILE.write_text(
        json.dumps(data, indent=2, default=str),
        encoding="utf-8"
    )


# ============================================================
# Schema Initialization
# ============================================================

def initialize_officer_schema() -> None:
    """Create field_officers table in PostgreSQL if available, and seed default accounts."""
    if _has_postgres():
        try:
            with _connect() as connection:
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        CREATE TABLE IF NOT EXISTS field_officers (
                            id UUID PRIMARY KEY,
                            officer_code TEXT UNIQUE NOT NULL,
                            full_name TEXT NOT NULL,
                            badge_number TEXT UNIQUE NOT NULL,
                            email TEXT UNIQUE NOT NULL,
                            role TEXT NOT NULL,
                            department TEXT NOT NULL,
                            district TEXT NOT NULL,
                            state TEXT NOT NULL,
                            password_hash TEXT NOT NULL,
                            created_at TIMESTAMPTZ NOT NULL
                        )
                        """
                    )
                connection.commit()
        except Exception as e:
            print(f"PostgreSQL officer schema init fallback: {e}")

    seed_default_officers()


# ============================================================
# Default Seeded Officers
# ============================================================

DEFAULT_OFFICERS = [
    {
        "id": "11111111-2222-3333-4444-555555555501",
        "officer_code": "OFFICER-409",
        "full_name": "Adjuster J. Smith",
        "badge_number": "#409",
        "email": "j.smith@agri-vision.gov",
        "role": "Senior Claims Adjuster",
        "department": "National Crop Insurance Auditing Directorate",
        "district": "Coimbatore",
        "state": "Tamil Nadu",
        "password": "officer123",
    },
    {
        "id": "11111111-2222-3333-4444-555555555502",
        "officer_code": "OFF-TN-108",
        "full_name": "Dr. Priya Sharma",
        "badge_number": "#108",
        "email": "priya.sharma@agri-vision.gov",
        "role": "Field Agronomist & Loss Assessor",
        "department": "Field Claims & Satellite Ground-Truth Division",
        "district": "Coimbatore",
        "state": "Tamil Nadu",
        "password": "officer123",
    },
    {
        "id": "11111111-2222-3333-4444-555555555503",
        "officer_code": "OFF-PB-722",
        "full_name": "Inspector R. Kumar",
        "badge_number": "#722",
        "email": "r.kumar@agri-vision.gov",
        "role": "Regional Risk & Audit Officer",
        "department": "Northern Zone Crop Insurance Oversight Unit",
        "district": "Ludhiana",
        "state": "Punjab",
        "password": "officer123",
    },
]


def seed_default_officers() -> None:
    """Ensure default officers exist in PostgreSQL and JSON store."""
    store = _read_json_store()
    now_iso = datetime.now(timezone.utc).isoformat()

    # Seed in JSON store
    for off in DEFAULT_OFFICERS:
        oid = off["id"]
        if oid not in store:
            store[oid] = {
                "id": oid,
                "officer_code": off["officer_code"],
                "full_name": off["full_name"],
                "badge_number": off["badge_number"],
                "email": off["email"],
                "role": off["role"],
                "department": off["department"],
                "district": off["district"],
                "state": off["state"],
                "password_hash": hash_password(off["password"]),
                "created_at": now_iso,
            }
    _write_json_store(store)

    # Seed in Postgres if available
    if _has_postgres():
        try:
            with _connect() as connection:
                with connection.cursor() as cursor:
                    for off in DEFAULT_OFFICERS:
                        cursor.execute(
                            """
                            INSERT INTO field_officers (
                                id, officer_code, full_name, badge_number, email,
                                role, department, district, state, password_hash, created_at
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                            ON CONFLICT (officer_code) DO NOTHING
                            """,
                            (
                                off["id"],
                                off["officer_code"],
                                off["full_name"],
                                off["badge_number"],
                                off["email"],
                                off["role"],
                                off["department"],
                                off["district"],
                                off["state"],
                                store[off["id"]]["password_hash"],
                                now_iso,
                            ),
                        )
                connection.commit()
        except Exception as e:
            print(f"PostgreSQL seed officers fallback: {e}")


# ============================================================
# Officer CRUD & Authentication
# ============================================================

def register_officer(data: dict[str, Any]) -> dict[str, Any]:
    """Register a new field officer."""
    officer_id = str(uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    officer_code = data.get("officer_code") or f"OFFICER-{secrets.randbelow(900000) + 100000}"
    badge_number = data.get("badge_number") or f"#{secrets.randbelow(900) + 100}"
    pwd_hash = hash_password(data["password"])

    record = {
        "id": officer_id,
        "officer_code": officer_code,
        "full_name": data["full_name"],
        "badge_number": badge_number,
        "email": data.get("email") or f"{officer_code.lower()}@agri-vision.gov",
        "role": data.get("role", "Field Claims Adjuster"),
        "department": data.get("department", "Agricultural Insurance Division"),
        "district": data.get("district", "General"),
        "state": data.get("state", "General"),
        "password_hash": pwd_hash,
        "created_at": now_iso,
    }

    if _has_postgres():
        try:
            with _connect() as connection:
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO field_officers (
                            id, officer_code, full_name, badge_number, email,
                            role, department, district, state, password_hash, created_at
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            record["id"],
                            record["officer_code"],
                            record["full_name"],
                            record["badge_number"],
                            record["email"],
                            record["role"],
                            record["department"],
                            record["district"],
                            record["state"],
                            record["password_hash"],
                            record["created_at"],
                        ),
                    )
                connection.commit()
        except Exception as e:
            print(f"PostgreSQL register_officer fallback: {e}")

    store = _read_json_store()
    store[officer_id] = record
    _write_json_store(store)

    sanitized = {k: v for k, v in record.items() if k != "password_hash"}
    return sanitized


def authenticate_officer(identifier: str, password: str) -> dict[str, Any] | None:
    """Authenticate officer via officer_code, badge_number (with or without #), or email."""
    ident = identifier.strip().lower()
    clean_badge = ident if ident.startswith("#") else f"#{ident}"

    # Try PostgreSQL first
    if _has_postgres():
        try:
            with _connect() as connection:
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT id, officer_code, full_name, badge_number, email,
                               role, department, district, state, password_hash, created_at
                        FROM field_officers
                        WHERE LOWER(officer_code) = %s 
                           OR LOWER(badge_number) = %s 
                           OR LOWER(badge_number) = %s
                           OR LOWER(email) = %s
                        """,
                        (ident, ident, clean_badge, ident),
                    )
                    row = cursor.fetchone()
            if row:
                stored_hash = row[9]
                if verify_password(password, stored_hash):
                    return {
                        "id": str(row[0]),
                        "officer_code": row[1],
                        "full_name": row[2],
                        "badge_number": row[3],
                        "email": row[4],
                        "role": row[5],
                        "department": row[6],
                        "district": row[7],
                        "state": row[8],
                        "created_at": row[10].isoformat() if hasattr(row[10], "isoformat") else str(row[10]),
                    }
                return None
        except Exception as e:
            print(f"PostgreSQL authenticate_officer fallback: {e}")

    # Fallback to JSON store
    store = _read_json_store()
    for record in store.values():
        r_code = record.get("officer_code", "").lower()
        r_badge = record.get("badge_number", "").lower()
        r_email = record.get("email", "").lower()
        if ident in (r_code, r_badge, r_email) or clean_badge == r_badge:
            if verify_password(password, record.get("password_hash", "")):
                return {k: v for k, v in record.items() if k != "password_hash"}
            return None

    return None


def get_officer_by_identifier(identifier: str) -> dict[str, Any] | None:
    """Lookup officer by officer_code, badge_number, or email."""
    ident = identifier.strip().lower()
    clean_badge = ident if ident.startswith("#") else f"#{ident}"

    if _has_postgres():
        try:
            with _connect() as connection:
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT id, officer_code, full_name, badge_number, email,
                               role, department, district, state, created_at
                        FROM field_officers
                        WHERE LOWER(officer_code) = %s 
                           OR LOWER(badge_number) = %s 
                           OR LOWER(badge_number) = %s
                           OR LOWER(email) = %s
                        """,
                        (ident, ident, clean_badge, ident),
                    )
                    row = cursor.fetchone()
            if row:
                return {
                    "id": str(row[0]),
                    "officer_code": row[1],
                    "full_name": row[2],
                    "badge_number": row[3],
                    "email": row[4],
                    "role": row[5],
                    "department": row[6],
                    "district": row[7],
                    "state": row[8],
                    "created_at": row[9].isoformat() if hasattr(row[9], "isoformat") else str(row[9]),
                }
        except Exception as e:
            print(f"PostgreSQL get_officer fallback: {e}")

    store = _read_json_store()
    for record in store.values():
        r_code = record.get("officer_code", "").lower()
        r_badge = record.get("badge_number", "").lower()
        r_email = record.get("email", "").lower()
        if ident in (r_code, r_badge, r_email) or clean_badge == r_badge:
            return {k: v for k, v in record.items() if k != "password_hash"}

    return None


def list_officers() -> list[dict[str, Any]]:
    """Return all active field officers (without password hashes)."""
    officers = []
    if _has_postgres():
        try:
            with _connect() as connection:
                with connection.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT id, officer_code, full_name, badge_number, email,
                               role, department, district, state, created_at
                        FROM field_officers
                        ORDER BY officer_code ASC
                        """
                    )
                    rows = cursor.fetchall()
            for row in rows:
                officers.append({
                    "id": str(row[0]),
                    "officer_code": row[1],
                    "full_name": row[2],
                    "badge_number": row[3],
                    "email": row[4],
                    "role": row[5],
                    "department": row[6],
                    "district": row[7],
                    "state": row[8],
                    "created_at": row[9].isoformat() if hasattr(row[9], "isoformat") else str(row[9]),
                })
            if officers:
                return officers
        except Exception as e:
            print(f"PostgreSQL list_officers fallback: {e}")

    store = _read_json_store()
    for record in store.values():
        officers.append({k: v for k, v in record.items() if k != "password_hash"})
    officers.sort(key=lambda o: o.get("officer_code", ""))
    return officers
