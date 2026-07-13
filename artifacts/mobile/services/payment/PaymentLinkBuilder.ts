import { formatUpiAmount, isValidUpiId } from "./UpiQrParser";
import type { UpiAppConfig, UpiAppId, UpiPaymentRequest } from "./types";

function buildQueryParams(request: UpiPaymentRequest): URLSearchParams {
  const params = new URLSearchParams();
  params.set("pa", request.payeeAddress);

  if (request.payeeName) params.set("pn", request.payeeName);
  if (request.merchantCode) params.set("mc", request.merchantCode);
  if (request.amount) params.set("am", request.amount);
  params.set("cu", request.currency ?? "INR");
  if (request.transactionNote) params.set("tn", request.transactionNote);
  if (request.transactionId) params.set("tid", request.transactionId);
  if (request.transactionRef) params.set("tr", request.transactionRef);

  return params;
}

function buildPath(scheme: string, request: UpiPaymentRequest): string {
  const query = buildQueryParams(request).toString();
  return `${scheme}?${query}`;
}

export const UPI_APPS: UpiAppConfig[] = [
  {
    id: "google_pay",
    label: "Google Pay",
    color: "#4285F4",
    scheme: "tez://upi/pay",
    buildDeepLink: (request) => buildPath("tez://upi/pay", request),
    storeUrl: {
      ios: "https://apps.apple.com/in/app/google-pay-save-pay-manage/id1193357048",
      android: "https://play.google.com/store/apps/details?id=com.google.android.apps.nbu.paisa.user",
      web: "https://pay.google.com",
    },
  },
  {
    id: "phonepe",
    label: "PhonePe",
    color: "#5F259F",
    scheme: "phonepe://pay",
    buildDeepLink: (request) => buildPath("phonepe://pay", request),
    storeUrl: {
      ios: "https://apps.apple.com/in/app/phonepe-secure-payments-app/id1170055821",
      android: "https://play.google.com/store/apps/details?id=com.phonepe.app",
      web: "https://www.phonepe.com",
    },
  },
  {
    id: "paytm",
    label: "Paytm",
    color: "#00BAF2",
    scheme: "paytmmp://pay",
    buildDeepLink: (request) => buildPath("paytmmp://pay", request),
    storeUrl: {
      ios: "https://apps.apple.com/in/app/paytm-payments-bank-wallet/id473941634",
      android: "https://play.google.com/store/apps/details?id=net.one97.paytm",
      web: "https://paytm.com",
    },
  },
];

export function getUpiApp(appId: UpiAppId): UpiAppConfig | undefined {
  return UPI_APPS.find((app) => app.id === appId);
}

export function buildGenericUpiLink(request: UpiPaymentRequest): string {
  return buildPath("upi://pay", request);
}

export function validatePaymentRequest(request: UpiPaymentRequest): string | null {
  if (!request.payeeAddress?.trim()) return "UPI ID is required";
  if (!isValidUpiId(request.payeeAddress)) return "Enter a valid UPI ID";
  if (request.amount !== undefined && request.amount !== "") {
    const amount = Number.parseFloat(request.amount);
    if (!Number.isFinite(amount) || amount <= 0) return "Enter a valid amount";
  }
  return null;
}

export function createPaymentRequest(input: {
  payeeAddress: string;
  payeeName?: string;
  merchantCode?: string;
  amount?: number;
  note?: string;
}): UpiPaymentRequest {
  const request: UpiPaymentRequest = {
    payeeAddress: input.payeeAddress.trim(),
    payeeName: input.payeeName?.trim() || undefined,
    merchantCode: input.merchantCode?.trim() || undefined,
    currency: "INR",
    transactionNote: input.note?.trim() || undefined,
  };

  if (input.amount !== undefined && input.amount > 0) {
    request.amount = formatUpiAmount(input.amount);
  }

  return request;
}

export function getStoreUrlForPlatform(
  appId: UpiAppId,
  platform: "ios" | "android" | "web",
): string {
  const app = getUpiApp(appId);
  if (!app) return "https://play.google.com/store/apps";
  return app.storeUrl[platform];
}
