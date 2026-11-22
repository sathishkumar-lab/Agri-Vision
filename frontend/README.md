# Agri-Vision Web Client

The Agri-Vision web application is built with Next.js 16 (App Router), React 19, TypeScript, and Tailwind CSS. It serves two distinct user personas: **Farmers** and **Insurance Officers**.

---

## Portals & Features

### 1. Farmer Portal
* **Dashboard (`/farmer/dashboard`):** Overview of registered land parcels, observation histories, and filed claims.
* **Farm Monitoring (`/farmer/farms/[farmId]/timeline`):** Temporal visual progression tracking crop vigor and disease indicators.
* **Claim Submission (`/claims/new`):** Multi-photo guided capture interface supporting both close-up leaf photos and wide field-angle shots with automatic browser GPS coordinate resolution.

### 2. Insurance Officer Portal
* **Auditor Dashboard (`/officer/dashboard`):** Real-time claim triage queue highlighting high-risk anomalies and automated evidence scores.
* **Claim Review (`/claims/[id]`):** Deep-dive claim evaluation panel featuring interactive OpenStreetMap geofencing overlays, AI disease confidence breakdowns, and pixel damage segmentation masks.
* **Field Intelligence (`/field-intelligence`):** Regional disease distribution and geospatial incidence heatmaps.

---

## Getting Started

### Prerequisites
* Node.js 18+ or Node.js 20+
* npm or pnpm

### Setup Instructions
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment:
   ```bash
   cp .env.example .env.local
   ```
3. Run local development server:
   ```bash
   npm run dev
   ```
4. Access the web interface at `http://localhost:3000`.
