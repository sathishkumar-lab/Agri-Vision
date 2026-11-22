import { Farmer, FieldOfficer } from "./api";

const FARMER_STORAGE_KEY = "agri_vision_farmer_session";
const OFFICER_STORAGE_KEY = "agri_vision_officer_session";

function notifyAuthChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("agri_vision_auth_change"));
  }
}

// ==========================================
// Farmer Authentication Session
// ==========================================

export function getStoredFarmer(): Farmer | null {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(FARMER_STORAGE_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data);
    delete parsed.password;
    delete parsed.password_hash;
    return parsed as Farmer;
  } catch {
    return null;
  }
}

export function setStoredFarmer(farmer: Farmer): void {
  if (typeof window === "undefined") return;
  try {
    const sanitized = { ...farmer };
    delete (sanitized as any).password;
    delete (sanitized as any).password_hash;
    localStorage.setItem(FARMER_STORAGE_KEY, JSON.stringify(sanitized));
    // Clear officer session when logging in as farmer
    localStorage.removeItem(OFFICER_STORAGE_KEY);
    notifyAuthChange();
  } catch (err) {
    console.error("Failed to save farmer session to localStorage", err);
  }
}

export function clearStoredFarmer(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(FARMER_STORAGE_KEY);
    notifyAuthChange();
  } catch (err) {
    console.error("Failed to clear farmer session", err);
  }
}

// ==========================================
// Field Officer Authentication Session
// ==========================================

export function getStoredOfficer(): FieldOfficer | null {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(OFFICER_STORAGE_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data);
    delete parsed.password;
    delete parsed.password_hash;
    return parsed as FieldOfficer;
  } catch {
    return null;
  }
}

export function setStoredOfficer(officer: FieldOfficer): void {
  if (typeof window === "undefined") return;
  try {
    const sanitized = { ...officer };
    delete (sanitized as any).password;
    delete (sanitized as any).password_hash;
    localStorage.setItem(OFFICER_STORAGE_KEY, JSON.stringify(sanitized));
    // Clear farmer session when logging in as officer
    localStorage.removeItem(FARMER_STORAGE_KEY);
    notifyAuthChange();
  } catch (err) {
    console.error("Failed to save officer session to localStorage", err);
  }
}

export function clearStoredOfficer(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(OFFICER_STORAGE_KEY);
    notifyAuthChange();
  } catch (err) {
    console.error("Failed to clear officer session", err);
  }
}

// ==========================================
// Unified Session Check
// ==========================================

export interface UserSession {
  role: "farmer" | "officer" | null;
  farmer: Farmer | null;
  officer: FieldOfficer | null;
}

export function getActiveSession(): UserSession {
  const officer = getStoredOfficer();
  if (officer) {
    return { role: "officer", officer, farmer: null };
  }
  const farmer = getStoredFarmer();
  if (farmer) {
    return { role: "farmer", farmer, officer: null };
  }
  return { role: null, farmer: null, officer: null };
}

export function clearAllSessions(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(FARMER_STORAGE_KEY);
  localStorage.removeItem(OFFICER_STORAGE_KEY);
  notifyAuthChange();
}
