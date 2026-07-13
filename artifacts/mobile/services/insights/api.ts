import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

import type { InsightsRequestPayload, InsightsResponse } from "./types";

const CACHE_KEY = "@vault_insights_cache";
const API_BASE_KEY = "@vault_api_base";

/**
 * Resolve the API base URL.
 * Priority: 1) EXPO_PUBLIC_API_URL env var  2) AsyncStorage override  3) hostUri heuristic
 */
async function getBaseUrl(): Promise<string> {
  // 1) Env var at build time (production) or explicit Expo config
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl.replace(/\/+$/, "");

  // 2) Runtime override stored by user
  try {
    const stored = await AsyncStorage.getItem(API_BASE_KEY);
    if (stored) return stored.replace(/\/+$/, "");
  } catch {}

  // 3) Dev heuristic: Expo Go hostUri → infer API server address
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    return `http://${host}:3001`;
  }

  return "";
}

export async function generateInsights(
  payload: InsightsRequestPayload,
): Promise<InsightsResponse> {
  const baseUrl = await getBaseUrl();
  const url = baseUrl ? `${baseUrl}/api/insights/generate` : "/api/insights/generate";

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error");
    throw new Error(`Insights API error (${response.status}): ${text}`);
  }

  const data: InsightsResponse = await response.json();
  return data;
}

export async function cacheInsights(data: InsightsResponse): Promise<void> {
  try {
    await AsyncStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ data, timestamp: Date.now() }),
    );
  } catch {}
}

export async function getCachedInsights(): Promise<InsightsResponse | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data: InsightsResponse; timestamp: number };
    return parsed.data;
  } catch {
    return null;
  }
}

export async function clearCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch {}
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const baseUrl = await getBaseUrl();
    const url = baseUrl ? `${baseUrl}/api/insights/health` : "/api/insights/health";
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}
