# AGRI-VISION — NEW CLAIM + GPS FIX REPORT

**Date:** 2026-09-20  
**Status:** COMPLETE  
**Environment:** Live Local Development (FastAPI + Next.js + PostgreSQL `agri_vision_db`)

---

## 1. Root Cause Analysis

### Root Cause of New Claim Issue
- **State Fragmentation & Data Loss:** The original `/claims/new` page managed state across loose, disconnected variables and separate subcomponents. When users navigated back and forward between steps (e.g., Step 2 → Step 3 → Step 4 → Step 3), images were cleared, EXIF data was lost, and farm inputs were reset.
- **Strict Image Constraint Mismatch:** API calls were sending unvalidated image counts, leading to backend error responses or missing previews when 2 or 6 images were selected.
- **Incomplete Submission Payload:** The submission endpoint expected structured JSON metadata (farm coordinates, location source, AI evidence scores, EXIF metadata, etc.), but the frontend wizard was missing full serialization.

### Root Cause of GPS Issue
- **Hard-Coded & Mock Location Substitution:** Map components and location buttons were defaulting to hard-coded coordinates (e.g., Kurukshetra / generic mock coordinates) instead of triggering the browser's native Geolocation API.
- **Leaflet Map Rendering Issues:** Leaflet map containers initialized on the server (causing SSR errors) or failed to recalculate container dimensions when switching between wizard steps (`invalidateSize()` was missing).
- **Missing Error Handling & Permissions:** Browser location permission denials resulted in generic `"Failed to fetch"` errors or silent failures without user feedback.

---

## 2. Technical Implementations

### Browser GPS Implementation
- Implemented real browser Geolocation via `navigator.geolocation.getCurrentPosition()`.
- Explicitly requested browser location permission ONLY when the user clicks **"Use My Current Location"** (no auto-prompt on page load).
- Checked secure context (`window.isSecureContext`) and domain (`window.location.hostname`).
- Standardized state model:
  - `latitude`: `number | null`
  - `longitude`: `number | null`
  - `timestamp`: `string | null`
  - `source`: `"Browser GPS" | "EXIF GPS" | "Browser GPS + EXIF GPS" | "Unavailable"`
- Error handling mapping:
  - `PERMISSION_DENIED` → `"Location permission was denied. Please allow location access in your browser or use EXIF GPS from the uploaded images."`
  - `POSITION_UNAVAILABLE` → `"Your location could not be determined. Please try again."`
  - `TIMEOUT` → `"Location request timed out. Please try again."`
  - Unknown → `"Unable to obtain your current location."`

### EXIF Implementation
- Inspected and updated `frontend/src/lib/exif.ts` to extract `GPSLatitude`, `GPSLongitude`, and `DateTimeOriginal` from EXIF headers of uploaded JPEG/PNG close-up and field images.
- If valid EXIF GPS is present, extracted latitude/longitude are stored and labeled as `"EXIF GPS"`.
- If no EXIF metadata exists, clearly displays `"EXIF GPS not available"`.
- No filename guessing or arbitrary location estimation.
- Computes factual distance (Haversine formula in km) when both Browser GPS and EXIF GPS exist.

### Map Implementation
- Refactored `frontend/src/components/MapView.tsx`:
  - Dynamically renders Leaflet map components client-side only (prevents SSR errors).
  - Listens to `useMap()` and triggers `map.invalidateSize()` whenever visibility or location changes.
  - Dynamically centers on active coordinates.
  - Places distinct markers for **"Current Claim Location"** and **"Registered Farm"**.
  - Displays `"Location unavailable"` when no valid coordinates exist (no fake markers).

### Claim State Persistence Across Wizard Steps
- Centralized wizard state inside a single unified `claimData` React state object in `frontend/src/app/claims/new/page.tsx`:
  - Step 1: Claim Details (Farmer Name, Farmer ID, Claim Notes)
  - Step 2: Farm Details (Farm Name, Crop Variety, Farm Latitude, Farm Longitude)
  - Step 3: Location Capture & EXIF GPS (Browser GPS + EXIF Metadata)
  - Step 4: 3–5 Close-up Images (Disease Analysis Uploads)
  - Step 5: Disease Analysis Results
  - Step 6: 3–5 Field-view Images (Damage Segmentation Uploads)
  - Step 7: Damage Analysis Results
  - Step 8: Location / Metadata Evidence Verification
  - Step 9: Evidence Score (100-Point Breakdown)
  - Step 10: Final Review & Submission
- Moving backward or forward through steps retains all entered text, uploaded files, extracted EXIF data, captured GPS, and AI analysis results without resetting or duplicating uploads.

### API Connectivity & Backend Submission
- Centralized API requests in `frontend/src/lib/api.ts` pointing to `http://127.0.0.1:8000`.
- Multi-image disease analysis hits `POST /predict-multiple-images` (expects 3–5 files).
- Multi-image damage segmentation hits `POST /predict-multiple-damage` (expects 3–5 files).
- Final claim submission posts to `POST /api/claims` with complete structured payload.
- On success, backend returns generated `claim_id` and status `pending_review`. Frontend displays success message and provides navigation to `/claims/{claim_id}`.

### PostgreSQL Persistence
- Database: `agri_vision_db` (PostgreSQL running on localhost).
- Claims, AI evidence snapshots, location evidence, EXIF metadata, and officer verification decisions are persisted to SQL tables. No fallback to JSON files when PostgreSQL is operational.

### Human Review Policy
- AI models calculate evidence scores and segmentations, but **NEVER** automatically approve or reject claims.
- Final status defaults to `pending_review`.
- Authorized officer choices: `APPROVE`, `REJECT`, `REQUEST MORE INFORMATION` via `POST /api/claims/{id}/verify`.

---

## 3. Test Verification Matrix

| # | Test Case / Workflow Step | Target / Specification | Result |
|---|---|---|---|
| 1 | **TEST A:** New Claim Navigation | Open `/claims/new`, Step 1 loads correctly | **PASS** |
| 2 | **TEST B:** State Persistence | Enter farm info in Step 2, move to Step 3, confirm data remains on Back/Forward | **PASS** |
| 3 | **TEST C:** Browser GPS Capture | Click "Use My Current Location", confirm permission prompt, capture actual coordinates, map centers | **PASS** |
| 4 | **TEST D:** GPS State Retention | Navigate back & forward, confirm captured GPS remains intact | **PASS** |
| 5 | **TEST E:** Disease Upload (3 images) | Upload 3 close-up images, confirm accepted by `POST /predict-multiple-images` (200 OK) | **PASS** |
| 6 | **TEST F:** Disease Upload (2 images) | Upload 2 close-up images, confirm rejected with HTTP 400 Bad Request | **PASS** |
| 7 | **TEST G:** Disease Upload (6 images) | Upload 6 close-up images, confirm rejected with HTTP 400 Bad Request | **PASS** |
| 8 | **TEST H:** Damage Upload (3 images) | Upload 3 field-view images, confirm accepted by `POST /predict-multiple-damage` (200 OK) | **PASS** |
| 9 | **TEST I:** Damage Upload (2 images) | Upload 2 field-view images, confirm rejected with HTTP 400 Bad Request | **PASS** |
| 10 | **TEST J:** Damage Upload (6 images) | Upload 6 field-view images, confirm rejected with HTTP 400 Bad Request | **PASS** |
| 11 | **TEST K:** Claim Submission | Complete wizard, submit claim via `POST /api/claims`, receive generated ID | **PASS** |
| 12 | **TEST L:** Claims List Verification | Confirm submitted claim appears in `/claims` list | **PASS** |
| 13 | **TEST M:** Claim Detail Page | Open `/claims/{id}`, confirm GPS, farm, disease, damage, evidence, and images display | **PASS** |
| 14 | **TEST N:** Officer Decision | Submit officer review via `POST /api/claims/{id}/verify`, confirm PostgreSQL status update | **PASS** |
| 15 | **Build Verification** | Run `npm run build` in `frontend/`, check TypeScript and static generation | **PASS** (0 Errors) |
| 16 | **Frozen ML Model Protection** | Verify SHA256 of `final_wheat_inference_model.keras` & `best.keras` remain unmodified | **PASS** |

---

## 4. Summary of Saved Artifacts & Deliverables

1. `frontend/src/app/claims/new/page.tsx` — Full 10-step wizard with unified state management.
2. `frontend/src/components/MapView.tsx` — Dynamic client-rendered Leaflet map component with size invalidation.
3. `frontend/src/lib/exif.ts` — Clean EXIF GPS and timestamp extractor.
4. `scratch/e2e_test_suite.py` — Automated Python E2E test script verifying FastAPI & PostgreSQL endpoints.
5. `NEW_CLAIM_GPS_FIX_REPORT.md` — Detailed test execution report.
