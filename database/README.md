# Database Architecture: PostgreSQL & Fallback JSON Store

Agri-Vision features an enterprise dual-mode data persistence architecture designed for zero-downtime development and production scalability.

## Architecture Overview

```
                      +-----------------------------+
                      |   FastAPI Service Layer     |
                      +--------------+--------------+
                                     |
                      +--------------v--------------+
                      |    _has_postgres() Probe    |
                      +-------+--------------+------+
                              |              |
                   Connected  |              | Connection Error /
                              v              | Offline
               +-------------------+    +----v--------------------+
               | PostgreSQL Engine |    | Local JSON Store Engine |
               | (Enterprise Rel.) |    | (backend/data/*.json)   |
               +-------------------+    +-------------------------+
```

1. **Production Mode (PostgreSQL 14+)**:
   - Uses relational schemas with foreign key constraints, indexes on high-frequency query paths (`observation_date`, `farm_id`, `mobile_number`), and JSONB storage for AI predictions and audit logs.
   - Run `database/schema.sql` to initialize all tables.
2. **Development & Demo Fallback Mode (Local JSON Stores)**:
   - If PostgreSQL is not reachable, the service automatically falls back to atomic local JSON stores in `backend/data/`.
   - Allows instant local demonstration, rapid prototyping, and automated CI tests without needing external database containers.

## Tables & Entities

| Entity | Primary Key | Description |
| :--- | :--- | :--- |
| `farmers` | `id (UUID)` | Registered farmer profiles, authentication, contact credentials. |
| `farms` | `id (UUID)` | Registered land parcels, survey numbers, acreage, GPS bounding coordinates. |
| `field_officers` | `id (UUID)` | Insurance adjusters, credentials, badge numbers, jurisdictional districts. |
| `observations` | `id (UUID)` | Field monitoring sessions, GPS capture, automated 100-point evidence score. |
| `observation_images` | `id (UUID)` | Multi-angle close-up and panoramic field-view crop evidence images. |
| `crop_claim_analysis`| `claim_id (UUID)` | Final submitted claims, aggregated AI outputs, and officer decision audit logs. |

## Quick Setup

To spin up a PostgreSQL instance via Docker:

```bash
docker run -d \
  --name agri-vision-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=agri_vision \
  -p 5432:5432 \
  postgres:16-alpine
```

Execute the schema:

```bash
psql -h localhost -U postgres -d agri_vision -f database/schema.sql
```
