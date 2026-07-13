import * as FileSystem from "expo-file-system";

import { checkAllQuality } from "./imageQuality";
import { getOcrProvider } from "./ocrService";
import type { CardError, CardErrorCode, OcrResult, QualityCheckResult, ScanSession, ValidatedCard } from "@/types";
import { validateAll } from "./validation";

function makeError(code: CardErrorCode, message: string, retryable: boolean, suggestion?: string): CardError {
  return { code, message, retryable, suggestion };
}

function buildInitialSession(): ScanSession {
  return {
    state: "idle",
    error: null,
    qualityResults: null,
    ocrResult: null,
    reviewData: null,
    validatedCard: null,
    retryCount: 0,
  };
}

export async function processCapturedImage(
  imagePath: string,
  retryCount: number,
): Promise<{
  session: ScanSession;
  tempPathsToCleanup: string[];
}> {
  const tempPathsToCleanup: string[] = [];
  const session: ScanSession = {
    ...buildInitialSession(),
    state: "quality_check",
    retryCount,
  };

  try {
    if (!imagePath) {
      return {
        session: { ...session, state: "error", error: makeError("capture_failed", "No image was captured", true) },
        tempPathsToCleanup,
      };
    }

    const fileInfo = await FileSystem.getInfoAsync(imagePath);
    if (!fileInfo.exists || fileInfo.size === 0) {
      return {
        session: { ...session, state: "error", error: makeError("capture_failed", "Captured image is empty", true) },
        tempPathsToCleanup,
      };
    }

    const imageData = await loadImageData(imagePath);
    if (!imageData) {
      return {
        session: { ...session, state: "error", error: makeError("ocr_failed", "Failed to read image data", true) },
        tempPathsToCleanup,
      };
    }
    tempPathsToCleanup.push(imagePath);

    const qualityResult = checkAllQuality(imageData);
    session.qualityResults = qualityResult;

    if (!qualityResult.passed) {
      const failedChecks: string[] = [];
      if (!qualityResult.checks.blur.passed) failedChecks.push("blur");
      if (!qualityResult.checks.lowLight.passed) failedChecks.push("low_light");
      if (!qualityResult.checks.glare.passed) failedChecks.push("glare");
      if (!qualityResult.checks.orientation.passed) failedChecks.push("orientation");
      if (!qualityResult.checks.positioning.passed) failedChecks.push("positioning");

      const suggestion = getQualitySuggestion(failedChecks);

      return {
        session: {
          ...session,
          state: "quality_failed",
          error: makeError(
            `quality_${failedChecks[0]}` as CardErrorCode,
            suggestion,
            true,
            suggestion,
          ),
        },
        tempPathsToCleanup,
      };
    }

    session.state = "processing";

    const provider = getOcrProvider();
    const ocrResult = await provider.recognizeText(imagePath);

    session.ocrResult = ocrResult;

    const fieldsFound = [ocrResult.cardNumber.value, ocrResult.holderName.value, ocrResult.expiryMonth.value].filter(Boolean).length;

    if (!ocrResult.cardNumber.value) {
      return {
        session: {
          ...session,
          state: "error",
          error: makeError("ocr_no_text_found", "No card number found. Ensure the card is well-lit and centered.", true, "Try adjusting lighting and position"),
        },
        tempPathsToCleanup,
      };
    }

    const cardNumber = ocrResult.cardNumber.value;
    const holderName = ocrResult.holderName.value;
    const expiryMonth = ocrResult.expiryMonth.value;
    const expiryYear = ocrResult.expiryYear.value;

    if (!expiryMonth || !expiryYear) {
      return {
        session: {
          ...session,
          state: "error",
          error: makeError("validation_expired", "Could not read expiry date. Ensure the date is clearly visible.", true, "Position the card so MM/YY is readable"),
        },
        tempPathsToCleanup,
      };
    }

    const validation = validateAll(cardNumber, holderName, expiryMonth, expiryYear);

    if (!validation.passed) {
      const reasons: string[] = [];
      if (!validation.checks.luhn.passed) reasons.push("luhn_failed");
      if (!validation.checks.expiry.passed) reasons.push("expired");

      const errorCode: CardErrorCode = reasons.includes("luhn_failed")
        ? "validation_luhn_failed"
        : "validation_expired";

      const errorMsg = reasons.includes("luhn_failed")
        ? "Card number is invalid. Please try again or enter details manually."
        : "Card has expired. Please use a valid card.";

      return {
        session: {
          ...session,
          state: "error",
          error: makeError(errorCode, errorMsg, true, "Try scanning a different card"),
        },
        tempPathsToCleanup,
      };
    }

    const lastFour = cardNumber.slice(-4);

    const validatedCard: ValidatedCard = {
      cardNetwork: validation.checks.scheme.network ?? "unknown",
      issuer: validation.checks.issuer.name ?? null,
      lastFour,
      expiryMonth,
      expiryYear,
    };

    session.validatedCard = validatedCard;
    session.state = "review";

    const lowConfidenceFields: string[] = [];
    if (ocrResult.cardNumber.confidence < 0.7) lowConfidenceFields.push("cardNumber");
    if (holderName && ocrResult.holderName.confidence < 0.7) lowConfidenceFields.push("holderName");

    session.reviewData = {
      cardNumber: validation.checks.luhn.formatted ?? cardNumber,
      cardNetwork: validatedCard.cardNetwork,
      issuer: validatedCard.issuer,
      holderName,
      expiryMonth,
      expiryYear,
      rawConfidence: ocrResult.overallConfidence,
      lowConfidenceFields,
    };

    return { session, tempPathsToCleanup };
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return {
      session: {
        ...session,
        state: "error",
        error: makeError("unknown", message, true),
      },
      tempPathsToCleanup,
    };
  }
}

async function loadImageData(path: string): Promise<{ width: number; height: number; data: Uint8Array } | null> {
  try {
    const base64 = await FileSystem.readAsStringAsync(path, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const binaryStr = atob(base64);
    const len = binaryStr.length;
    const data = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      data[i] = binaryStr.charCodeAt(i);
    }

    const width = 640;
    const height = Math.floor(len / 4 / width);

    return { width, height: height > 0 ? height : 480, data };
  } catch {
    return null;
  }
}

function getQualitySuggestion(failedChecks: string[]): string {
  if (failedChecks.includes("blur")) return "Hold the phone steady and try again";
  if (failedChecks.includes("low_light")) return "Move to a brighter area and try again";
  if (failedChecks.includes("glare")) return "Tilt the card away from direct light";
  if (failedChecks.includes("orientation")) return "Align the card parallel to the frame";
  if (failedChecks.includes("positioning")) return "Center the card within the frame";
  return "Adjust the card position and try again";
}

export async function cleanupTempFiles(paths: string[]): Promise<void> {
  for (const p of paths) {
    try {
      const info = await FileSystem.getInfoAsync(p);
      if (info.exists) {
        await FileSystem.deleteAsync(p, { idempotent: true });
      }
    } catch {}
  }
}
