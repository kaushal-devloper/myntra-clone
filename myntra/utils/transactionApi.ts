import { getApiBaseUrl } from "./apiBaseUrl";
import { getUserData } from "./storage";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PaymentMode = "UPI" | "Card" | "COD" | "Wallet" | "NetBanking" | "Other";
export type PaymentStatus = "pending" | "success" | "failed" | "refunded";
export type SortOption = "date_desc" | "date_asc" | "amount_desc" | "amount_asc";

export interface Transaction {
  _id: string;
  userId: string;
  orderId?: string | null;
  amount: number;
  currency: string;
  paymentMode: PaymentMode;
  paymentStatus: PaymentStatus;
  description: string;
  receiptUrl?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface TransactionsResponse {
  success: boolean;
  data: Transaction[];
  pagination: PaginationMeta;
}

export interface FetchTransactionsParams {
  page?: number;
  limit?: number;
  status?: string;
  mode?: string;
  sort?: SortOption;
  search?: string;
}

export interface TransactionSummary {
  totalTransactions: number;
  totalSpent: number;
  totalRefunded: number;
  byStatus: Record<PaymentStatus, number>;
  byMode: Partial<Record<PaymentMode, number>>;
}

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function getAuthToken(): Promise<string> {
  const { token } = await getUserData();
  if (!token) {
    throw new Error("Not authenticated. Please log in.");
  }
  return token;
}

function buildHeaders(token: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "bypass-tunnel-reminder": "true",
  };
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * Fetch a paginated list of transactions for the authenticated user.
 */
export async function fetchTransactions(
  params: FetchTransactionsParams = {}
): Promise<TransactionsResponse> {
  const token = await getAuthToken();
  const baseUrl = getApiBaseUrl();

  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));
  if (params.status && params.status !== "all") query.set("status", params.status);
  if (params.mode && params.mode !== "all") query.set("mode", params.mode);
  if (params.sort) query.set("sort", params.sort);
  if (params.search && params.search.trim()) query.set("search", params.search.trim());

  const url = `${baseUrl}/api/transactions?${query.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: buildHeaders(token),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw new Error("Session expired. Please log in again.");
    }
    throw new Error(errorData.message || `Request failed (${response.status})`);
  }

  return response.json();
}

/**
 * Fetch a single transaction by ID (ownership enforced by backend).
 */
export async function fetchTransactionById(id: string): Promise<Transaction> {
  const token = await getAuthToken();
  const baseUrl = getApiBaseUrl();

  const response = await fetch(`${baseUrl}/api/transactions/${id}`, {
    method: "GET",
    headers: buildHeaders(token),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error("Session expired. Please log in again.");
    if (response.status === 403) throw new Error("Access denied.");
    if (response.status === 404) throw new Error("Transaction not found.");
    throw new Error(errorData.message || `Request failed (${response.status})`);
  }

  const result = await response.json();
  return result.data;
}

/**
 * Create a new transaction for the authenticated user.
 */
export async function createTransaction(
  payload: Omit<Transaction, "_id" | "userId" | "currency" | "createdAt" | "updatedAt">
): Promise<Transaction> {
  const token = await getAuthToken();
  const baseUrl = getApiBaseUrl();

  const response = await fetch(`${baseUrl}/api/transactions`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Request failed (${response.status})`);
  }

  const result = await response.json();
  return result.data;
}

/**
 * Compute a client-side summary from a list of transactions.
 * This avoids an extra network round-trip while the backend summary endpoint
 * is not yet implemented, and stays perfectly accurate for the loaded page set.
 *
 * For a full-dataset summary, call the summary after fetching all pages OR
 * add a dedicated backend endpoint later.
 */
export function computeTransactionSummary(transactions: Transaction[]): TransactionSummary {
  const byStatus: Record<PaymentStatus, number> = {
    success: 0,
    pending: 0,
    failed: 0,
    refunded: 0,
  };
  const byMode: Partial<Record<PaymentMode, number>> = {};

  let totalSpent = 0;
  let totalRefunded = 0;

  for (const t of transactions) {
    byStatus[t.paymentStatus] = (byStatus[t.paymentStatus] || 0) + 1;
    byMode[t.paymentMode] = (byMode[t.paymentMode] || 0) + 1;

    if (t.paymentStatus === "success") totalSpent += t.amount;
    if (t.paymentStatus === "refunded") totalRefunded += t.amount;
  }

  return {
    totalTransactions: transactions.length,
    totalSpent,
    totalRefunded,
    byStatus,
    byMode,
  };
}

export interface ExportTransactionsParams {
  format: "pdf" | "csv" | "xlsx";
  status?: string;
  mode?: string;
  sort?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface ExportResponse {
  success: boolean;
  message: string;
  downloadUrl: string;
  filename: string;
}

/**
 * Call backend to generate transaction export file.
 */
export async function generateTransactionExport(
  params: ExportTransactionsParams
): Promise<ExportResponse> {
  const token = await getAuthToken();
  const baseUrl = getApiBaseUrl();

  const response = await fetch(`${baseUrl}/api/transactions/export`, {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error("Session expired. Please log in again.");
    throw new Error(errorData.message || `Request failed (${response.status})`);
  }

  return response.json();
}

export interface BackendSummary {
  totalTransactions: number;
  totalSpent: number;
  successful: number;
  failed: number;
  refunded: number;
  pending: number;
}

export interface SummaryResponse {
  success: boolean;
  data: BackendSummary;
}

/**
 * Fetch transaction summary statistics from the backend based on current filters.
 */
export async function fetchTransactionSummary(
  params: { status?: string; mode?: string; search?: string } = {}
): Promise<SummaryResponse> {
  const token = await getAuthToken();
  const baseUrl = getApiBaseUrl();

  const query = new URLSearchParams();
  if (params.status && params.status !== "all") query.set("status", params.status);
  if (params.mode && params.mode !== "all") query.set("mode", params.mode);
  if (params.search && params.search.trim()) query.set("search", params.search.trim());

  const response = await fetch(`${baseUrl}/api/transactions/summary?${query.toString()}`, {
    method: "GET",
    headers: buildHeaders(token),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error("Session expired. Please log in again.");
    throw new Error(errorData.message || `Request failed (${response.status})`);
  }

  return response.json();
}


