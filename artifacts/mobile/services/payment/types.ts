export type UpiAppId = "google_pay" | "phonepe" | "paytm" | "generic";

export interface UpiPaymentRequest {
  payeeAddress: string;
  payeeName?: string;
  merchantCode?: string;
  amount?: string;
  currency?: string;
  transactionNote?: string;
  transactionId?: string;
  transactionRef?: string;
}

export interface ParsedUpiQr {
  payeeAddress: string;
  payeeName?: string;
  merchantCode?: string;
  amount?: string;
  currency?: string;
  transactionNote?: string;
  transactionId?: string;
  transactionRef?: string;
  raw: string;
}

export interface UpiAppConfig {
  id: UpiAppId;
  label: string;
  color: string;
  scheme: string;
  buildDeepLink: (request: UpiPaymentRequest) => string;
  storeUrl: {
    ios: string;
    android: string;
    web: string;
  };
}

export type LaunchResult =
  | { ok: true; appId: UpiAppId }
  | {
      ok: false;
      reason: "app_not_installed" | "invalid_request" | "launch_failed" | "unsupported_platform";
      appId: UpiAppId;
    };

export interface LaunchedPaymentRecord {
  id: string;
  amount: number;
  merchant: string;
  payeeAddress: string;
  note?: string;
  launchedVia: UpiAppId;
  date: string;
}
