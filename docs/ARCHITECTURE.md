# Agri-Vision System Architecture

Agri-Vision is an AI-powered agricultural claim verification platform designed to automate crop health assessments, prevent insurance fraud, and streamline field audits.

---

## 1. High-Level System Architecture

```
+-------------------------------------------------------------------------+
|                              Farmer Client                              |
|   (Mobile Browser / PWA - GPS Geolocation, EXIF Extraction, Multi-Photo) |
+------------------------------------+------------------------------------+
                                     |
                                     v HTTP / REST
+------------------------------------+------------------------------------+
|                         FastAPI Application                             |
|                                                                         |
|  +--------------------+  +--------------------+  +-------------------+  |
|  | Authentication     |  | Geofencing Engine  |  | Claim Scorer      |  |
|  | JWT / Role Checks  |  | Haversine Distance |  | 100-Point Formula |  |
|  +--------------------+  +--------------------+  +-------------------+  |
+---------+--------------------------+-------------------------+----------+
          |                          |                         |
          v                          v                         v
+---------+----------+     +---------+----------+    +---------+----------+
|  Disease Classifier|     | Damage Segmenter   |    |    Data Store      |
|  MobileNetV2 (CNN) |     | Residual U-Net     |    | PostgreSQL / JSON  |
|  Healthy/Septoria/ |     | 3-Class Pixel Map  |    | Relational Tables  |
|  Stripe Rust       |     | (Crop vs Damage)   |    | & Audit Records    |
+--------------------+     +--------------------+    +--------------------+
                                                               ^
                                                               | Review / Audit
+--------------------------------------------------------------+----------+
|                           Insurance Adjuster                            |
|             (Web Dashboard - OpenStreetMap, Heatmaps, Review)           |
+-------------------------------------------------------------------------+
```

---

## 2. Artificial Intelligence Pipelines

### A. Crop Disease Classification
* **Model Backbone:** Transfer learning using MobileNetV2 pre-trained on ImageNet and fine-tuned on localized wheat foliar pathology datasets.
* **Target Classes:** Healthy, Septoria Leaf Blotch, Stripe Rust (Yellow Rust).
* **Multi-Image Consensus:** Individual claims collect 3 to 5 leaf close-ups. Individual inference results are aggregated across shots using soft voting and confidence weighting to eliminate single-photo false positives.

### B. Damage Extent Segmentation
* **Model Architecture:** Residual U-Net segmentation network featuring residual skip connections.
* **Pixel Classes:**
  1. `Background (0)`: Soil, sky, agricultural equipment, non-crop elements.
  2. `Healthy Crop (1)`: Foliage displaying normal chlorophyll pigmentation.
  3. `Damaged Crop (2)`: Foliage exhibiting necrosis, chlorosis, or lodging.
* **Metrics Extraction:** Exact percentage of damaged crop surface area is calculated by isolating non-background pixels:
  $$\text{Damage Ratio} = \frac{\text{Damaged Pixels}}{\text{Healthy Pixels} + \text{Damaged Pixels}} \times 100$$

---

## 3. Anti-Fraud & Geospatial Engine

To prevent claim spoofing and cross-field photographic fraud:
1. **Dual GPS Collection:** Captures both browser geolocation coordinates and native camera EXIF tags.
2. **Haversine Boundary Checks:** Compares capture location against the surveyed farm parcel coordinates.
3. **Distance Scoring:** Claims captured outside the registered farm threshold receive an evidence penalty.

---

## 4. Resilience & Fallback Data Architecture

* **Primary Engine:** PostgreSQL with relational integrity, foreign keys, and JSONB document storage.
* **Offline Fallback:** Automatically switches to structured local JSON stores in `backend/data/` if the database is disconnected, ensuring zero local setup friction for demos and testing.
