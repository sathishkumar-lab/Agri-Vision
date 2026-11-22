# Agri-Vision REST API Reference

The backend runs on FastAPI and provides interactive documentation via Swagger UI at `/docs`.

---

## Base URL
* Local Development: `http://127.0.0.1:8000`

---

## Key API Endpoints

### 1. Authentication & Profiles
* `POST /api/farmers/register`: Register a farmer account with contact details and password.
* `POST /api/farmers/login`: Authenticate farmer via mobile number and password.
* `POST /api/officers/register`: Register an insurance field officer.
* `POST /api/officers/login`: Authenticate insurance adjuster credentials.

### 2. Land & Farm Management
* `POST /api/farms`: Register a surveyed land parcel with survey number, acreage, and GPS coordinates.
* `GET /api/farms/farmer/{farmer_id}`: Retrieve all parcels owned by a specific farmer.
* `GET /api/farms/{farm_id}`: Retrieve detailed farm parcel metadata.

### 3. Field Observations & Health Tracking
* `POST /api/observations/start`: Initialize an observation session for a farm.
* `POST /api/observations/{id}/upload-image`: Upload individual close-up or field-view photos.
* `POST /api/observations/{id}/finalize`: Trigger multi-image aggregation and calculate session health scores.
* `GET /api/farms/{farm_id}/timeline`: Retrieve chronological crop progression data.

### 4. Claim Evidence & Verification
* `POST /api/claims/submit`: Submit a verified insurance claim bundle.
* `GET /api/claims`: List all filed claims with status filters (pending, approved, rejected).
* `GET /api/claims/{claim_id}`: Fetch complete claim dossier including AI evidence, GPS audits, and photo masks.
* `POST /api/claims/{claim_id}/verify`: Record adjuster review decisions (Approved, Rejected, Field Visit Needed).
