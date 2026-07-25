import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

const ACCESS_TOKEN_KEY = "vault_access_token";
const REFRESH_TOKEN_KEY = "vault_refresh_token";

const API_PORT = 3001;

function apiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl;
  if (typeof window !== "undefined") return `http://localhost:${API_PORT}`;
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    return `http://${host}:${API_PORT}`;
  }
  return `http://localhost:${API_PORT}`;
}

let onLogout: (() => void) | null = null;

export function setOnLogout(cb: () => void) {
  onLogout = cb;
}

async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

async function setTokens(access: string, refresh: string) {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, access),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refresh),
  ]);
}

async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (!refreshToken) return null;

    const res = await fetch(`${apiBaseUrl()}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    await setTokens(data.access_token, data.refresh_token);
    return data.access_token;
  } catch {
    return null;
  }
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit & { skipAuth?: boolean },
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };

  if (!init?.skipAuth) {
    const token = await getAccessToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  let res = await fetch(`${apiBaseUrl()}/api${path}`, {
    ...init,
    headers,
  });

  if (res.status === 401 && !init?.skipAuth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(`${apiBaseUrl()}/api${path}`, { ...init, headers });
    } else {
      await clearTokens();
      onLogout?.();
      throw new Error("Session expired");
    }
  }

  const text = await res.text();

  if (!res.ok) {
    let message: string;
    try {
      const parsed = JSON.parse(text);
      message = parsed.error || parsed.message || `HTTP ${res.status}`;
    } catch {
      message = text || `HTTP ${res.status}`;
    }
    throw new Error(message);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

// ─── Auth ───────────────────────────────────────────

export function sendOtp(phone: string) {
  return apiFetch<{ message: string }>("/auth/send-otp", {
    method: "POST",
    body: JSON.stringify({ phone }),
    skipAuth: true,
  });
}

export function verifyOtp(
  phone: string,
  otp: string,
  deviceFingerprint: string,
  pushToken?: string,
) {
  return apiFetch<
    | { access_token: string; refresh_token: string; user: any }
    | { requires_registration: true; phone: string }
  >("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ phone, otp, device_fingerprint: deviceFingerprint, push_token: pushToken }),
    skipAuth: true,
  });
}

export function register(
  phone: string,
  otp: string,
  name: string,
  deviceFingerprint: string,
  pushToken?: string,
) {
  return apiFetch<{ access_token: string; refresh_token: string; user: any }>(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify({ phone, otp, name, device_fingerprint: deviceFingerprint, push_token: pushToken }),
      skipAuth: true,
    },
  );
}

export function refreshToken(refreshToken: string) {
  return apiFetch<{ access_token: string; refresh_token: string }>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
    skipAuth: true,
  });
}

export function logout() {
  return apiFetch<{ success: boolean }>("/auth/logout", { method: "POST" });
}

// ─── Wallet ─────────────────────────────────────────

export function getWallet() {
  return apiFetch<{ wallet: { id: string; balance_paise: number; upi_lite_paise: number; spendable_paise: number } }>("/wallet");
}

export function topup(amountPaise: number, source: string) {
  return apiFetch<{ wallet: any; transaction: any }>("/wallet/topup", {
    method: "POST",
    body: JSON.stringify({ amount_paise: amountPaise, source }),
  });
}

export function transfer(toUpiId: string, amountPaise: number, note?: string, idempotencyKey?: string) {
  return apiFetch<{ transaction: any }>("/wallet/transfer", {
    method: "POST",
    body: JSON.stringify({ to_upi_id: toUpiId, amount_paise: amountPaise, note, idempotency_key: idempotencyKey }),
  });
}

export function getTransactions(params?: {
  page?: number;
  limit?: number;
  category?: string;
  from_date?: string;
  to_date?: string;
}) {
  const qs = params ? "?" + new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)])),
  ).toString() : "";
  return apiFetch<{ transactions: any[]; total: number; page: number; limit: number }>(
    `/wallet/transactions${qs}`,
  );
}

// ─── Payments / Reserved Amounts ────────────────────

export function getReservedAmounts() {
  return apiFetch<{ reserved: any[]; total_reserved_paise: number }>("/payments/reserved");
}

export function createReservedAmount(data: {
  label: string;
  amount_paise: number;
  category: string;
  due_date: string;
  is_recurring: boolean;
  interval?: string;
}) {
  return apiFetch<{ reserved: any }>("/payments/reserved", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteReservedAmount(id: string) {
  return apiFetch<{ success: boolean }>(`/payments/reserved/${id}`, { method: "DELETE" });
}

export function getScheduledPayments() {
  return apiFetch<{ upcoming: any[] }>("/payments/scheduled");
}

// ─── Documents ──────────────────────────────────────

export function getDocuments() {
  return apiFetch<{ documents: any[] }>("/documents");
}

export function getDocument(id: string) {
  return apiFetch<{ document: any }>(`/documents/${id}`);
}

export function getUploadUrl(documentType: string, contentType: string) {
  return apiFetch<{ upload_url: string; object_key: string; expires_in: number }>(
    "/documents/upload-url",
    { method: "POST", body: JSON.stringify({ document_type: documentType, content_type: contentType }) },
  );
}

export function createDocument(data: { type: string; encrypted_number: string; file_url: string; expiry_date?: string }) {
  return apiFetch<{ document: any }>("/documents", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteDocument(id: string) {
  return apiFetch<{ success: boolean }>(`/documents/${id}`, { method: "DELETE" });
}

// ─── Cards ──────────────────────────────────────────

export function getCards() {
  return apiFetch<{ cards: any[] }>("/cards");
}

export function getCard(id: string) {
  return apiFetch<{ card: any }>(`/cards/${id}`);
}

export function createCard(data: any) {
  return apiFetch<{ card: any }>("/cards", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function freezeCard(id: string) {
  return apiFetch<{ card: any }>(`/cards/${id}/freeze`, { method: "POST" });
}

export function unfreezeCard(id: string) {
  return apiFetch<{ card: any }>(`/cards/${id}/unfreeze`, { method: "POST" });
}

export function deleteCard(id: string) {
  return apiFetch<{ success: boolean }>(`/cards/${id}`, { method: "DELETE" });
}

// ─── Tickets ────────────────────────────────────────

export function getTickets(params?: { status?: string; type?: string }) {
  const qs = params ? "?" + new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)])),
  ).toString() : "";
  return apiFetch<{ tickets: any[] }>(`/tickets${qs}`);
}

export function getTicket(id: string) {
  return apiFetch<{ ticket: any }>(`/tickets/${id}`);
}

export function createTicket(data: any) {
  return apiFetch<{ ticket: any }>("/tickets", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateTicketStatus(id: string, status: string) {
  return apiFetch<{ ticket: any }>(`/tickets/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function deleteTicket(id: string) {
  return apiFetch<{ success: boolean }>(`/tickets/${id}`, { method: "DELETE" });
}

export function getTicketByPnr(pnr: string) {
  return apiFetch<{ ticket: any }>(`/tickets/pnr/${pnr}`);
}

// ─── Transport ──────────────────────────────────────

export function getPasses() {
  return apiFetch<{ passes: any[] }>("/transport/passes");
}

export function getPass(id: string) {
  return apiFetch<{ pass: any }>(`/transport/passes/${id}`);
}

export function createPass(data: any) {
  return apiFetch<{ pass: any }>("/transport/passes", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function topupPass(id: string, amountPaise: number) {
  return apiFetch<{ pass: any; transaction: any }>(`/transport/passes/${id}/topup`, {
    method: "POST",
    body: JSON.stringify({ amount_paise: amountPaise }),
  });
}

export function deletePass(id: string) {
  return apiFetch<{ success: boolean }>(`/transport/passes/${id}`, { method: "DELETE" });
}

// ─── Rewards ────────────────────────────────────────

export function getRewards(params?: { type?: string; active_only?: string }) {
  const qs = params ? "?" + new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)])),
  ).toString() : "";
  return apiFetch<{ rewards: any[] }>(`/rewards${qs}`);
}

export function getReward(id: string) {
  return apiFetch<{ reward: any }>(`/rewards/${id}`);
}

export function deleteReward(id: string) {
  return apiFetch<{ success: boolean }>(`/rewards/${id}`, { method: "DELETE" });
}

// ─── Notifications ──────────────────────────────────

export function getNotifications(params?: { unread_only?: string; type?: string; limit?: number }) {
  const qs = params ? "?" + new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)])),
  ).toString() : "";
  return apiFetch<{ notifications: any[]; unread_count: number }>(`/notifications${qs}`);
}

export function markRead(id: string) {
  return apiFetch<{ notification: any }>(`/notifications/${id}/read`, { method: "PATCH" });
}

export function markAllRead() {
  return apiFetch<{ updated_count: number }>("/notifications/read-all", { method: "PATCH" });
}

export function deleteNotification(id: string) {
  return apiFetch<{ success: boolean }>(`/notifications/${id}`, { method: "DELETE" });
}

// ─── Budgets ────────────────────────────────────────

export function getBudgets(params?: { month?: string }) {
  const qs = params?.month ? `?month=${params.month}` : "";
  return apiFetch<{ budgets: any[] }>(`/budgets${qs}`);
}

export function createBudget(data: { category: string; limit_paise: number; month?: string }) {
  return apiFetch<{ budget: any }>("/budgets", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateBudget(id: string, limitPaise: number) {
  return apiFetch<{ budget: any }>(`/budgets/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ limit_paise: limitPaise }),
  });
}

export function deleteBudget(id: string) {
  return apiFetch<{ success: boolean }>(`/budgets/${id}`, { method: "DELETE" });
}

// ─── Subscriptions ──────────────────────────────────

export function getSubscriptions(params?: { status?: string; cadence?: string }) {
  const qs = params ? "?" + new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)])),
  ).toString() : "";
  return apiFetch<{ subscriptions: any[]; monthly_total_paise: number; yearly_total_paise: number }>(
    `/subscriptions${qs}`,
  );
}

export function updateSubscriptionStatus(id: string, status: string) {
  return apiFetch<{ subscription: any }>(`/subscriptions/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function detectSubscriptions() {
  return apiFetch<{ detected: number; skipped: number; message: string }>("/subscriptions/detect", {
    method: "POST",
  });
}

export function deleteSubscription(id: string) {
  return apiFetch<{ success: boolean }>(`/subscriptions/${id}`, { method: "DELETE" });
}

// ─── Insights ───────────────────────────────────────

export function getSafeToSpend() {
  return apiFetch<{
    balance_paise: number;
    reserved_paise: number;
    upcoming_subscriptions_paise: number;
    safe_to_spend_paise: number;
    warning: string | null;
  }>("/insights/safe-to-spend");
}

export function getForecast(days: number = 30) {
  return apiFetch<any>(`/insights/forecast?days=${days}`);
}

export function getCashflowSummary() {
  return apiFetch<{ months: any[] }>("/insights/cashflow-summary");
}

export function getMerchantHistory(merchantName: string) {
  return apiFetch<any>(`/insights/merchant/${encodeURIComponent(merchantName)}`);
}

export function getTopCategories() {
  return apiFetch<{ categories: any[] }>("/insights/top-categories");
}

// ─── Analytics ──────────────────────────────────────

export function getSpendingBreakdown(params?: {
  period?: string;
  custom_from?: string;
  custom_to?: string;
}) {
  const qs = params ? "?" + new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)])),
  ).toString() : "";
  return apiFetch<any>(`/analytics/spending-breakdown${qs}`);
}

export function getDailySpending(month?: string) {
  const qs = month ? `?month=${month}` : "";
  return apiFetch<any>(`/analytics/daily-spending${qs}`);
}

export function getMerchantFrequency() {
  return apiFetch<{ merchants: any[] }>("/analytics/merchant-frequency");
}

export function getStatement(params: { from: string; to: string; format?: string; type?: string }) {
  const qs = "?" + new URLSearchParams(params).toString();
  return apiFetch<any>(`/analytics/statement${qs}`);
}

export function getNetWorth() {
  return apiFetch<{
    assets: { wallet_paise: number; transit_passes_paise: number; total_paise: number };
    liabilities: { reserved_obligations_paise: number; annualised_subscriptions_paise: number; total_paise: number };
    net_worth_paise: number;
    computed_at: string;
  }>("/analytics/net-worth");
}

export { apiBaseUrl, getAccessToken, setTokens, clearTokens };
