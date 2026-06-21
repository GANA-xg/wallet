import { Linking, Platform } from "react-native";

import {
  createPaymentRequest,
  getStoreUrlForPlatform,
  getUpiApp,
  validatePaymentRequest,
} from "./PaymentLinkBuilder";
import type { LaunchResult, UpiAppId, UpiPaymentRequest } from "./types";

export {
  UPI_APPS,
  buildGenericUpiLink,
  createPaymentRequest,
  getUpiApp,
  validatePaymentRequest,
} from "./PaymentLinkBuilder";

export function isUpiDeepLinkSupported(): boolean {
  return Platform.OS === "android" || Platform.OS === "web";
}

export async function canOpenUpiApp(appId: UpiAppId): Promise<boolean> {
  if (Platform.OS === "web") return true;
  if (Platform.OS !== "android") return false;

  const app = getUpiApp(appId);
  if (!app) return false;

  try {
    return await Linking.canOpenURL(`${app.scheme}?pa=test@upi`);
  } catch {
    return false;
  }
}

export async function launchUpiPayment(
  appId: UpiAppId,
  request: UpiPaymentRequest,
): Promise<LaunchResult> {
  const validationError = validatePaymentRequest(request);
  if (validationError) {
    return { ok: false, reason: "invalid_request", appId };
  }

  const app = getUpiApp(appId);
  if (!app) {
    return { ok: false, reason: "launch_failed", appId };
  }

  if (!isUpiDeepLinkSupported()) {
    return { ok: false, reason: "unsupported_platform", appId };
  }

  const deepLink = app.buildDeepLink(request);

  if (Platform.OS === "android") {
    const installed = await canOpenUpiApp(appId);
    if (!installed) {
      return { ok: false, reason: "app_not_installed", appId };
    }
  }

  try {
    await Linking.openURL(deepLink);
    return { ok: true, appId };
  } catch {
    return { ok: false, reason: "launch_failed", appId };
  }
}

export function getStoreUrl(appId: UpiAppId): string {
  const platform = Platform.OS === "ios" ? "ios" : Platform.OS === "android" ? "android" : "web";
  return getStoreUrlForPlatform(appId, platform);
}

export async function openAppStore(appId: UpiAppId): Promise<void> {
  await Linking.openURL(getStoreUrl(appId));
}
