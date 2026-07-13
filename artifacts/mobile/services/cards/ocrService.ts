import type { OcrField, OcrResult } from "@/types";

const CARD_NUMBER_PATTERN = /\b\d{13,19}\b/;
const EXPIRY_PATTERN = /\b(0[1-9]|1[0-2])\/(\d{2}|\d{4})\b/;
const NAME_PATTERN = /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$/;

export interface OcrProvider {
  recognizeText(imagePath: string): Promise<OcrResult>;
  dispose(): void;
}

export class MlKitOcrProvider implements OcrProvider {
  private module: any = null;
  private initialized = false;

  private async getModule(): Promise<any> {
    if (!this.initialized) {
      try {
        this.module = require("@react-native-ml-kit/text-recognition");
      } catch {
        return null;
      }
      this.initialized = true;
    }
    return this.module;
  }

  async recognizeText(imagePath: string): Promise<OcrResult> {
    const mod = await this.getModule();
    if (!mod) {
      return {
        cardNumber: { value: null, confidence: 0 },
        holderName: { value: null, confidence: 0 },
        expiryMonth: { value: null, confidence: 0 },
        expiryYear: { value: null, confidence: 0 },
        rawText: "",
        overallConfidence: 0,
      };
    }

    try {
      const result = await mod.default.recognize(imagePath);

      const allBlocks = result.blocks ?? [];
      const allLines = allBlocks.flatMap((b: any) => b.lines ?? []);
      const allElements = allLines.flatMap((l: any) => l.elements ?? []);

      const rawText = allLines.map((l: any) => l.text).join("\n");

      let cardNumber: OcrField<string> = { value: null, confidence: 0 };
      let holderName: OcrField<string> = { value: null, confidence: 0 };
      let expiryMonth: OcrField<number> = { value: null, confidence: 0 };
      let expiryYear: OcrField<number> = { value: null, confidence: 0 };

      for (const element of allElements) {
        const text = element.text?.trim() ?? "";
        const confidence = element.confidence ?? 0;

        const numberMatch = text.replace(/\s/g, "").match(CARD_NUMBER_PATTERN);
        if (numberMatch && confidence > cardNumber.confidence) {
          cardNumber = { value: numberMatch[0], confidence };
        }

        const expiryMatch = text.match(EXPIRY_PATTERN);
        if (expiryMatch) {
          const month = parseInt(expiryMatch[1], 10);
          const yearStr = expiryMatch[2];
          let year = parseInt(yearStr, 10);
          if (yearStr.length === 2) year += 2000;

          if (!expiryMonth.value || confidence > expiryMonth.confidence) {
            expiryMonth = { value: month, confidence };
            expiryYear = { value: year, confidence };
          }
        }

        if (NAME_PATTERN.test(text) && confidence > holderName.confidence) {
          holderName = { value: text, confidence };
        }
      }

      const confidences = [cardNumber.confidence, holderName.confidence, expiryMonth.confidence].filter((c) => c > 0);
      const overallConfidence = confidences.length > 0
        ? confidences.reduce((a, b) => a + b, 0) / confidences.length
        : 0;

      return { cardNumber, holderName, expiryMonth, expiryYear, rawText, overallConfidence };
    } catch {
      return {
        cardNumber: { value: null, confidence: 0 },
        holderName: { value: null, confidence: 0 },
        expiryMonth: { value: null, confidence: 0 },
        expiryYear: { value: null, confidence: 0 },
        rawText: "",
        overallConfidence: 0,
      };
    }
  }

  dispose(): void {
    this.module = null;
    this.initialized = false;
  }
}

export class FallbackOcrProvider implements OcrProvider {
  private delegate: MlKitOcrProvider;

  constructor() {
    this.delegate = new MlKitOcrProvider();
  }

  async recognizeText(imagePath: string): Promise<OcrResult> {
    try {
      return await this.delegate.recognizeText(imagePath);
    } catch {
      return {
        cardNumber: { value: null, confidence: 0 },
        holderName: { value: null, confidence: 0 },
        expiryMonth: { value: null, confidence: 0 },
        expiryYear: { value: null, confidence: 0 },
        rawText: "",
        overallConfidence: 0,
      };
    }
  }

  dispose(): void {
    this.delegate.dispose();
  }
}

let activeProvider: OcrProvider | null = null;

export function getOcrProvider(): OcrProvider {
  if (!activeProvider) {
    activeProvider = new FallbackOcrProvider();
  }
  return activeProvider;
}

export function resetOcrProvider(): void {
  if (activeProvider) {
    activeProvider.dispose();
    activeProvider = null;
  }
}
