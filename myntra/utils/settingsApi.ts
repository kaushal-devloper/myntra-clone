import { getApiBaseUrl } from "./apiBaseUrl";
import { getUserData } from "./storage";

// ─── Helpers ───────────────────────────────────────────────────────────────

async function getToken(): Promise<string> {
  const { token } = await getUserData();
  if (!token) throw new Error("Not authenticated. Please log in.");
  return token;
}

function authHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "bypass-tunnel-reminder": "true",
  };
}

// ─── Types ─────────────────────────────────────────────────────────────────

export interface Address {
  fullName: string;
  mobile: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
}

export interface ResetDataSummary {
  [key: string]: number | string;
}

// ─── Change Password ──────────────────────────────────────────────────────

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<{ success: boolean; message: string }> {
  const token = await getToken();
  const res = await fetch(`${getApiBaseUrl()}/api/settings/change-password`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || `Failed to change password (${res.status})`);
  }
  return json;
}

// ─── Get Address ──────────────────────────────────────────────────────────

export async function getAddress(): Promise<Address | null> {
  const token = await getToken();
  const res = await fetch(`${getApiBaseUrl()}/api/settings/address`, {
    method: "GET",
    headers: authHeaders(token),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || `Failed to fetch address (${res.status})`);
  }
  return json.data;
}

// ─── Update Address ───────────────────────────────────────────────────────

export async function updateAddress(
  address: Address
): Promise<{ success: boolean; message: string; data: Address }> {
  const token = await getToken();
  const res = await fetch(`${getApiBaseUrl()}/api/settings/address`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(address),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || `Failed to update address (${res.status})`);
  }
  return json;
}

// ─── Reset User Data ──────────────────────────────────────────────────────

export async function resetUserData(): Promise<{
  success: boolean;
  message: string;
  data: ResetDataSummary;
}> {
  const token = await getToken();
  const res = await fetch(`${getApiBaseUrl()}/api/settings/reset-data`, {
    method: "POST",
    headers: authHeaders(token),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || `Failed to reset data (${res.status})`);
  }
  return json;
}
