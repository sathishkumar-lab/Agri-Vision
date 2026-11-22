# Agri-Vision: AI-Based Crop Image Analytics for Crop Insurance Claim Verification
## Final Master Full-Stack Application & System Architecture Report

### Executive Summary
**Agri-Vision** is an end-to-end, enterprise-grade crop insurance claim verification application that integrates multi-modal deep-learning analytics, geospatial EXIF geofencing, and an automated 100-point evidence scoring engine under strict human-in-the-loop governance.

The platform visual language is inspired by corporate agricultural leaders (such as İGSAŞ) utilizing deep forest green (`#1a382b`), agricultural green (`#2e7d32`), wheat gold (`#d4af37`), and editorial typography.

---

### Key Technical Accomplishments & Provenance Integrity

1. **Frozen Production ML Models**:
   - **Disease Classification**: MobileNetV2 architecture trained for 3-class diagnosis (`Healthy Wheat`, `Septoria Leaf Blotch`, `Stripe Rust / Yellow Rust`). Input resolution: $224 \times 224 \times 3$ RGB normalized with `keras.applications.mobilenet_v2.preprocess_input`. Model file: `models/final_wheat_inference_model.keras`.
   - **Damage Segmentation**: Residual U-Net architecture trained for 3-class pixel segmentation (`0 = Background`, `1 = Healthy Wheat`, `2 = Damaged Wheat`). Input resolution: $256 \times 256 \times 3$ RGB normalized to $[0, 1]$. Model file: `ml/damage_segmentation/models/production/best.keras`.

2. **Authoritative Benchmark Metrics**:
   - **Overall Pixel Accuracy**: **92.11%** (strictly defined as total correct pixel classifications across all 3 classes on the frozen 44-image test set).
   - **Background IoU**: **88.96%**
   - **Healthy Wheat IoU**: **89.41%** (Dice / F1: 94.41%)
   - **Damaged Wheat IoU**: **66.18%** (Dice / F1: 79.65%, Precision: 74.05%, Recall: 86.16%)
   - **Mean IoU (mIoU)**: **81.52%**
   - **Damage Percentage Error**: MAE = 6.12 percentage points, RMSE = 10.63 percentage points, Correlation = 0.933, $R^2 = 0.8466$.

3. **Multi-Image Processing Rules**:
   - **Close-Up Disease Images**: Enforces 3 to 5 photos per claim with voting consensus aggregation.
   - **Field-View Damage Images**: Enforces 3 to 5 photos per claim with aggregated damage ratio & binned severity (`0%`, `0-1%`, `1-2.77%`, `2.77-5%`, `5-10%`, `>10%`).

4. **100-Point Evidence Engine**:
   - Disease Evidence (max 25 pts)
   - Location Verification & Geofence Proximity (max 20 pts)
   - Image Requirements Completeness (max 15 pts)
   - Multi-Image Prediction Consistency (max 15 pts)
   - Visible Damage Support (max 15 pts)
   - EXIF Metadata Completeness (max 10 pts)

5. **Human-in-the-Loop Officer Workspace**:
   - AI predictions strictly designated as `AI-Assisted Assessment / Requires Human Review`.
   - Adjuster decisions: `APPROVE`, `REJECT`, `REQUEST MORE EVIDENCE` with mandatory rationale text recording.

---

### Technology Stack Summary
- **Frontend**: Next.js 14+ (App Router, TypeScript, Tailwind CSS, Lucide React, Leaflet & React-Leaflet GIS maps, EXIFReader).
- **Backend**: FastAPI (Python 3.10+, TensorFlow/Keras, OpenCV, NumPy, Pillow, Pydantic).
- **Database**: PostgreSQL with async fallback to local JSON persistent store (`backend/data/claims_store.json`).
