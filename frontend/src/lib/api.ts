/**
 * Centralized Agri-Vision Backend API Client
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export interface Claim {
  claim_id: string;
  created_at: string;
  ai_evidence: {
    farmer_name: string;
    farmer_id: string;
    farm_name: string;
    crop_variety: string;
    claim_code?: string;
    claim_title?: string;
    farmer_code?: string;
    farm_code?: string;
    db_farmer_id?: string;
    db_farm_id?: string;
    farmer_profile?: any;
    farm_profile?: any;
    farm_latitude?: number;
    farm_longitude?: number;
    claim_latitude?: number;
    claim_longitude?: number;
    location_source?: string;
    disease_analysis?: any;
    damage_analysis?: any;
    close_up_images?: any[];
    field_images?: any[];
    exif_metadata?: any;
    location_evidence?: any;
    historical_observations?: any;
    evidence_score?: {
      total_score: number;
      max_score: number;
      breakdown: {
        disease_evidence: { score: number; max: number };
        location_verification: { score: number; max: number };
        image_requirements: { score: number; max: number };
        prediction_consistency: { score: number; max: number };
        visible_damage_support: { score: number; max: number };
        metadata_completeness: { score: number; max: number };
      };
    };
  };
  officer_verification: {
    officer_name?: string;
    final_decision: "pending_review" | "approved" | "rejected" | "needs_more_evidence";
    notes?: string;
    verified_at?: string;
  };
}

/**
 * Format a real-world logical claim number / reference code.
 * Example: "CLM-2026-489675" or "CLM-2026-002F83"
 */
export function getClaimNumber(claim: Claim | any): string {
  if (!claim) return "CLM-2026-0000";
  const ev = claim.ai_evidence || {};
  if (ev.claim_code) return ev.claim_code;
  if (ev.claim_number) return ev.claim_number;

  const farmCode = ev.farm_code;
  if (farmCode && typeof farmCode === "string" && farmCode.startsWith("FARM-2026-")) {
    const num = farmCode.replace("FARM-2026-", "");
    return `CLM-2026-${num}`;
  }

  const rawId = (claim.claim_id || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (rawId.length >= 6) {
    const suffix = rawId.slice(-6);
    return `CLM-2026-${suffix}`;
  }
  return `CLM-2026-${rawId || "0001"}`;
}

/**
 * Format a human-readable, real-world logical title for the claim docket.
 * Example: "Durum Wheat Crop Loss Claim" or "Durum Wheat Stripe Rust Damage Claim"
 */
export function getLogicalClaimTitle(claim: Claim | any): string {
  if (!claim) return "Crop Loss Claim";
  const ev = claim.ai_evidence || {};
  if (ev.claim_title) return ev.claim_title;

  const crop = ev.crop_variety || ev.farm_profile?.crop_type || "Durum Wheat";
  const disease =
    ev.disease_analysis?.final_prediction ||
    ev.disease_analysis?.top_prediction;

  if (disease && disease !== "Healthy" && disease !== "Unknown") {
    return `${crop} ${disease} Damage Claim`;
  }
  return `${crop} Crop Loss Claim`;
}


/**
 * Fetch wrapper with AbortController timeout handling
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 12000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error: any) {
    if (error.name === "AbortError") {
      throw new Error("Agri-Vision service is taking too long to respond. Please check that FastAPI and PostgreSQL are running.");
    }
    if (error.message === "Failed to fetch" || error.name === "TypeError") {
      throw new Error("Agri-Vision analysis service is unavailable. Please ensure the FastAPI server is running.");
    }
    throw error;
  } finally {
    clearTimeout(id);
  }
}

export async function checkHealth() {
  const res = await fetchWithTimeout(`${API_BASE_URL}/health`);
  if (!res.ok) {
    throw new Error("Agri-Vision API health check failed.");
  }
  return res.json();
}

export async function predictDamageSingle(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetchWithTimeout(`${API_BASE_URL}/predict-damage`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Damage segmentation failed." }));
    throw new Error(errorData.detail || "Damage segmentation failed.");
  }
  return res.json();
}

export async function predictDamageMultiple(files: File[]) {
  if (files.length < 3 || files.length > 5) {
    throw new Error("Please upload between 3 and 5 field-view images for damage estimation.");
  }
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  const res = await fetchWithTimeout(`${API_BASE_URL}/predict-multiple-damage`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Multiple damage prediction failed." }));
    throw new Error(errorData.detail || "Multiple damage prediction failed.");
  }
  return res.json();
}

export async function predictDiseaseSingle(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetchWithTimeout(`${API_BASE_URL}/upload-image`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Disease prediction failed." }));
    throw new Error(errorData.detail || "Disease prediction failed.");
  }
  return res.json();
}

export async function predictDiseaseMultiple(files: File[]) {
  if (files.length < 3 || files.length > 5) {
    throw new Error("Please upload between 3 and 5 close-up images for disease identification.");
  }
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  const res = await fetchWithTimeout(`${API_BASE_URL}/predict-multiple-images`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Multiple disease prediction failed." }));
    throw new Error(errorData.detail || "Multiple disease prediction failed.");
  }
  return res.json();
}

export async function createClaim(payload: any) {
  const res = await fetchWithTimeout(`${API_BASE_URL}/api/claims`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to submit claim." }));
    throw new Error(errorData.detail || "Failed to submit claim.");
  }
  return res.json();
}

export async function getClaims(): Promise<{ total_claims: number; claims: Claim[] }> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/api/claims`);
  if (!res.ok) {
    throw new Error("Failed to fetch claims list.");
  }
  return res.json();
}

export async function getClaim(claimId: string): Promise<Claim> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/api/claims/${claimId}`);
  if (!res.ok) {
    throw new Error("Failed to fetch claim details.");
  }
  return res.json();
}

export async function verifyClaim(claimId: string, review: { officer_name: string; final_decision: string; notes?: string }) {
  const res = await fetchWithTimeout(`${API_BASE_URL}/api/claims/${claimId}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(review),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Failed to verify claim." }));
    throw new Error(errorData.detail || "Failed to verify claim.");
  }
  return res.json();
}

export interface Farmer {
  id: string;
  farmer_code: string;
  full_name: string;
  mobile_number: string;
  email?: string | null;
  address: string;
  district: string;
  state: string;
  created_at: string;
}

export interface Farm {
  id: string;
  farmer_id: string;
  farm_code: string;
  crop_type: string;
  area_acres: number;
  survey_number?: string | null;
  latitude: number;
  longitude: number;
  created_at: string;
}

export async function registerFarmer(payload: any): Promise<{ message: string; farmer: Farmer }> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/api/farmers/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Registration failed." }));
    throw new Error(errorData.detail || "Registration failed.");
  }
  return res.json();
}

export async function loginFarmer(payload: { identifier: string; password: string }): Promise<{ message: string; farmer: Farmer }> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/api/farmers/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Login failed." }));
    throw new Error(errorData.detail || "Invalid mobile number / Farmer ID or password.");
  }
  return res.json();
}

export async function getFarmerProfile(identifier: string): Promise<{ farmer: Farmer }> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/api/farmers/me/${identifier}`);
  if (!res.ok) {
    throw new Error("Failed to fetch farmer profile.");
  }
  return res.json();
}

export interface FieldOfficer {
  id: string;
  officer_code: string;
  full_name: string;
  badge_number: string;
  email: string;
  role: string;
  department: string;
  district: string;
  state: string;
  created_at: string;
}

export async function loginOfficer(payload: { identifier: string; password: string }): Promise<{ message: string; officer: FieldOfficer }> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/api/officers/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Login failed." }));
    throw new Error(errorData.detail || "Invalid Officer ID / Badge Number or password.");
  }
  return res.json();
}

export async function getOfficersList(): Promise<{ total_officers: number; officers: FieldOfficer[] }> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/api/officers/list`);
  if (!res.ok) {
    throw new Error("Failed to fetch officers list.");
  }
  return res.json();
}

export async function getOfficerProfile(identifier: string): Promise<{ officer: FieldOfficer }> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/api/officers/me/${identifier}`);
  if (!res.ok) {
    throw new Error("Failed to fetch officer profile.");
  }
  return res.json();
}

export async function registerOfficer(payload: any): Promise<{ message: string; officer: FieldOfficer }> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/api/officers/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Officer registration failed." }));
    throw new Error(errorData.detail || "Officer registration failed.");
  }
  return res.json();
}


export async function registerFarm(payload: any): Promise<{ message: string; farm: Farm }> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/api/farms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Farm registration failed." }));
    throw new Error(errorData.detail || "Farm registration failed.");
  }
  return res.json();
}

export async function getMyFarms(farmerIdentifier: string): Promise<{ total_farms: number; farms: Farm[] }> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/api/farms/my-farms/${farmerIdentifier}`);
  if (!res.ok) {
    throw new Error("Failed to fetch registered farms.");
  }
  return res.json();
}

export async function getFarm(farmIdentifier: string): Promise<Farm> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/api/farms/${farmIdentifier}`);
  if (!res.ok) {
    throw new Error("Failed to fetch farm details.");
  }
  return res.json();
}

export function getResultImageUrl(path: string | undefined): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  if (path.startsWith("/")) return `${API_BASE_URL}${path}`;
  return `${API_BASE_URL}/${path}`;
}

export interface ObservationImage {
  id: string;
  observation_id: string;
  image_path: string;
  image_type: "close_up" | "field_view";
  observation_zone: "zone_1" | "zone_2" | "zone_3" | "zone_4" | "zone_5";
  original_filename: string;
  uploaded_at: string;
  disease_prediction?: any;
  damage_prediction?: any;
}

export interface Observation {
  id: string;
  farm_id: string;
  farmer_id: string;
  observation_code: string;
  observation_date: string;
  latitude: number;
  longitude: number;
  gps_accuracy: number;
  gps_source: string;
  status: "uploading" | "complete" | "analyzing" | "analyzed" | "finalized" | "failed";
  image_count: number;
  close_up_count: number;
  field_view_count: number;
  disease_result?: string | null;
  disease_confidence?: number | null;
  damage_percentage?: number | null;
  evidence_score?: number | null;
  created_at: string;
  updated_at: string;
  finalized_at?: string | null;
  images?: ObservationImage[];
}

export interface ObservationComparison {
  current_observation_id: string;
  current_observation_code: string;
  current_observation_date: string;
  previous_observation_id: string;
  previous_observation_code: string;
  previous_observation_date: string;
  previous_damage_percentage: number;
  current_damage_percentage: number;
  damage_change_percentage_points: number;
  previous_disease: string;
  current_disease: string;
  disease_changed: boolean;
  previous_evidence_score: number;
  current_evidence_score: number;
  evidence_score_change: number;
  gps_distance_from_farm_km: number;
}

export interface FarmTimeline {
  farm_id: string;
  farm_code?: string;
  crop_type: string;
  area_acres: number;
  survey_number?: string;
  farm_latitude?: number;
  farm_longitude?: number;
  total_observations: number;
  valid_observations_count: number;
  trend_available: boolean;
  first_observation_date?: string;
  latest_observation_date?: string;
  first_damage_percentage?: number;
  latest_damage_percentage?: number;
  overall_damage_change_percentage_points?: number;
  disease_history: Array<{
    observation_id: string;
    observation_code: string;
    date: string;
    disease_result: string;
    confidence: number;
  }>;
  consecutive_comparisons: ObservationComparison[];
  observations: Observation[];
}

export async function createObservation(formData: FormData): Promise<{
  message: string;
  observation: Observation;
  evidence_score_breakdown?: any;
  gps_distance_from_farm_km?: number;
}> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/api/observations`, {
    method: "POST",
    body: formData,
  }, 45000); // Allow longer timeout for 10-image AI analysis
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Observation submission failed." }));
    throw new Error(errorData.detail || "Observation submission failed.");
  }
  return res.json();
}

export async function getObservation(observationId: string): Promise<Observation> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/api/observations/${observationId}`);
  if (!res.ok) {
    throw new Error("Failed to fetch observation details.");
  }
  return res.json();
}

export async function getFarmObservations(farmId: string): Promise<{ farm_id: string; total_observations: number; observations: Observation[] }> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/api/farms/${farmId}/observations`);
  if (!res.ok) {
    throw new Error("Failed to fetch farm observations.");
  }
  return res.json();
}

export async function getFarmTimeline(farmId: string): Promise<FarmTimeline> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/api/farms/${farmId}/observations/timeline`);
  if (!res.ok) {
    throw new Error("Failed to fetch farm observation timeline.");
  }
  return res.json();
}



