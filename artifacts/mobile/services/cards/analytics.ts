import type { CardAnalyticsEvent } from "./types";

export function trackCardEvent(event: CardAnalyticsEvent): void {
  try {
    console.log("[Analytics]", event);
  } catch {}
}

export function trackOnboardingStart(method: "scan" | "manual"): void {
  trackCardEvent({ event: "card_onboarding_started", payload: { method } });
}

export function trackScanCaptured(): void {
  trackCardEvent({ event: "card_scan_captured", payload: {} });
}

export function trackQualityFailed(reasons: string[], retryCount: number): void {
  trackCardEvent({ event: "card_scan_quality_failed", payload: { reasons, retryCount } });
}

export function trackOcrCompleted(confidence: number, fieldsFound: number): void {
  trackCardEvent({ event: "card_scan_ocr_completed", payload: { confidence, fieldsFound } });
}

export function trackValidationFailed(reasons: string[]): void {
  trackCardEvent({ event: "card_scan_validation_failed", payload: { reasons } });
}

export function trackScanConfirmed(network: string, source: "scan" | "manual"): void {
  trackCardEvent({
    event: "card_scan_confirmed",
    payload: { network: network as any, source },
  });
}

export function trackDuplicateDetected(): void {
  trackCardEvent({ event: "card_duplicate_detected", payload: {} });
}

export function trackCardAdded(network: string, source: "scan" | "manual"): void {
  trackCardEvent({ event: "card_added", payload: { network: network as any, source } });
}

export function trackCardRemoved(): void {
  trackCardEvent({ event: "card_removed", payload: {} });
}
