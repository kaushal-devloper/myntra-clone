import { getApiBaseUrl } from "./apiBaseUrl";
import { getUserData } from "./storage";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface OrderItem {
  productId?: string | null;
  name: string;
  brand: string;
  image: string;
  size?: string;
  price: number;
  discountedPrice: number;
  discount?: string;
  quantity: number;
}

export interface Order {
  _id: string;
  userId: string;
  transactionId?: string | null;
  orderId: string;
  date: string;
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
  items: OrderItem[];
  subtotal: number;
  tax: number;
  deliveryCharge: number;
  total: number;
  shippingAddress: string;
  paymentMode: "UPI" | "Card" | "COD" | "Wallet" | "NetBanking" | "Other";
  paymentStatus: "pending" | "success" | "failed" | "refunded";
  receiptUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderPayload {
  items: OrderItem[];
  subtotal: number;
  tax: number;
  deliveryCharge: number;
  total: number;
  shippingAddress: string;
  paymentMode: Order["paymentMode"];
}

export interface OrdersResponse {
  success: boolean;
  data: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

async function getToken(): Promise<string> {
  const { token } = await getUserData();
  if (!token) throw new Error("Not authenticated. Please log in.");
  return token;
}

function headers(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "bypass-tunnel-reminder": "true",
  };
}

// ─── API calls ─────────────────────────────────────────────────────────────

export async function createOrder(
  payload: CreateOrderPayload
): Promise<{ order: Order; transaction: any }> {
  const token = await getToken();
  const res = await fetch(`${getApiBaseUrl()}/api/orders`, {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Order creation failed (${res.status})`);
  }
  const json = await res.json();
  return json.data;
}

export async function fetchOrders(page = 1, limit = 20): Promise<OrdersResponse> {
  const token = await getToken();
  const res = await fetch(
    `${getApiBaseUrl()}/api/orders?page=${page}&limit=${limit}`,
    { method: "GET", headers: headers(token) }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error("Session expired. Please log in again.");
    throw new Error(err.message || `Failed to fetch orders (${res.status})`);
  }
  return res.json();
}

export async function fetchOrderById(id: string): Promise<Order> {
  const token = await getToken();
  const res = await fetch(`${getApiBaseUrl()}/api/orders/${id}`, {
    method: "GET",
    headers: headers(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch order (${res.status})`);
  }
  const json = await res.json();
  return json.data;
}

export async function fetchReceipt(orderId: string): Promise<string> {
  const token = await getToken();
  const res = await fetch(`${getApiBaseUrl()}/api/orders/${orderId}/receipt`, {
    method: "GET",
    headers: headers(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch receipt (${res.status})`);
  }
  const json = await res.json();
  return json.html as string;
}
