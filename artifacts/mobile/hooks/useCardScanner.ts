import { useCallback, useRef, useState } from "react";

import { cleanupTempFiles, processCapturedImage } from "@/services/cards/scanner";
import type { CardRecord, ScanSession, ValidatedCard } from "@/types";
import { checkDuplicate } from "@/services/cards/validation";

export type ScanPhase = ScanSession["state"];

export interface UseCardScannerReturn {
  session: ScanSession;
  startScan: () => void;
  onImageCaptured: (imagePath: string) => Promise<void>;
  retake: () => void;
  confirmCard: (overrides?: { nickname?: string; theme?: { gradientColors: string[] } }) => Promise<CardRecord | null>;
  cancelScan: () => void;
  reset: () => void;
}

export function useCardScanner(existingCards: CardRecord[] = []): UseCardScannerReturn {
  const [session, setSession] = useState<ScanSession>({
    state: "idle",
    error: null,
    qualityResults: null,
    ocrResult: null,
    reviewData: null,
    validatedCard: null,
    retryCount: 0,
  });

  const tempPathsRef = useRef<string[]>([]);
  const validatedCardRef = useRef<ValidatedCard | null>(null);

  const startScan = useCallback(() => {
    setSession({
      state: "ready",
      error: null,
      qualityResults: null,
      ocrResult: null,
      reviewData: null,
      validatedCard: null,
      retryCount: 0,
    });
    validatedCardRef.current = null;
    tempPathsRef.current = [];
  }, []);

  const onImageCaptured = useCallback(async (imagePath: string) => {
    setSession((prev) => ({ ...prev, state: "capturing" }));

    const retryCount = session.retryCount;
    const { session: resultSession, tempPathsToCleanup } = await processCapturedImage(imagePath, retryCount);

    tempPathsRef.current.push(...tempPathsToCleanup);
    validatedCardRef.current = resultSession.validatedCard;

    if (resultSession.state === "review" && resultSession.validatedCard) {
      const vc = resultSession.validatedCard;
      const dup = checkDuplicate(
        { lastFour: vc.lastFour, expiryMonth: vc.expiryMonth, expiryYear: vc.expiryYear },
        existingCards,
      );

      if (dup.isDuplicate) {
        setSession((prev) => ({
          ...prev,
          ...resultSession,
          error: {
            code: "duplicate_card",
            message: "This card is already in your wallet",
            retryable: false,
            suggestion: "Tap confirm to add again, or cancel",
          },
        }));
        return;
      }
    }

    setSession((prev) => ({ ...prev, ...resultSession }));
  }, [session.retryCount, existingCards]);

  const retake = useCallback(() => {
    cleanupTempFiles(tempPathsRef.current);
    tempPathsRef.current = [];
    validatedCardRef.current = null;

    setSession((prev) => ({
      ...prev,
      state: "ready",
      error: null,
      qualityResults: null,
      ocrResult: null,
      reviewData: null,
      validatedCard: null,
      retryCount: prev.retryCount + 1,
    }));
  }, []);

  const confirmCard = useCallback(async (
    overrides?: { nickname?: string; theme?: { gradientColors: string[] } },
  ): Promise<CardRecord | null> => {
    const vc = validatedCardRef.current;
    if (!vc) return null;

    const now = new Date().toISOString();
    const newCard: CardRecord = {
      id: `card_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId: "local",
      cardNetwork: vc.cardNetwork,
      issuer: vc.issuer,
      lastFour: vc.lastFour,
      expiryMonth: vc.expiryMonth,
      expiryYear: vc.expiryYear,
      nickname: overrides?.nickname ?? `${vc.cardNetwork.charAt(0).toUpperCase() + vc.cardNetwork.slice(1)} •••• ${vc.lastFour}`,
      theme: overrides?.theme ?? { gradientColors: ["#2a2a2a", "#222222"] },
      frozen: false,
      balance: 0,
      createdAt: now,
      updatedAt: now,
    };

    setSession({ ...session, state: "done", validatedCard: vc });

    cleanupTempFiles(tempPathsRef.current);
    tempPathsRef.current = [];

    return newCard;
  }, [session]);

  const cancelScan = useCallback(() => {
    cleanupTempFiles(tempPathsRef.current);
    tempPathsRef.current = [];
    validatedCardRef.current = null;

    setSession({
      state: "idle",
      error: null,
      qualityResults: null,
      ocrResult: null,
      reviewData: null,
      validatedCard: null,
      retryCount: 0,
    });
  }, []);

  const reset = useCallback(() => {
    cancelScan();
  }, [cancelScan]);

  return { session, startScan, onImageCaptured, retake, confirmCard, cancelScan, reset };
}
