export interface DocumentOcrField {
  value: string | null;
  confidence: number;
}

export interface OcrDiagnostics {
  mlKitLoaded: boolean;
  blocksFound: number;
  linesFound: number;
  elementsFound: number;
  rawTextLength: number;
  error?: string;
}

export interface DocumentOcrResult {
  rawText: string;
  fields: DocumentOcrField[];
  overallConfidence: number;
  diagnostics: OcrDiagnostics;
}

let mlKitModule: any = null;
let initialized = false;

async function getMlKit(): Promise<any> {
  if (!initialized) {
    try {
      mlKitModule = require("@react-native-ml-kit/text-recognition");
    } catch (e) {
      mlKitModule = null;
    }
    initialized = true;
  }
  return mlKitModule;
}

export async function recognizeDocumentText(imagePath: string): Promise<DocumentOcrResult> {
  const empty: DocumentOcrResult = {
    rawText: "",
    fields: [],
    overallConfidence: 0,
    diagnostics: {
      mlKitLoaded: false,
      blocksFound: 0,
      linesFound: 0,
      elementsFound: 0,
      rawTextLength: 0,
      error: "ML Kit module not available",
    },
  };

  try {
    const mod = await getMlKit();
    if (!mod) {
      return empty;
    }

    let result: any;
    try {
      result = await mod.default.recognize(imagePath);
    } catch (e: any) {
      return {
        rawText: "",
        fields: [],
        overallConfidence: 0,
        diagnostics: {
          mlKitLoaded: true,
          blocksFound: 0,
          linesFound: 0,
          elementsFound: 0,
          rawTextLength: 0,
          error: `Recognition failed: ${e?.message ?? "Unknown error"}`,
        },
      };
    }

    const blocks = result.blocks ?? [];
    const allLines = blocks.flatMap((b: any) => b.lines ?? []);
    const allElements = allLines.flatMap((l: any) => l.elements ?? []);

    const rawText = allLines.map((l: any) => l.text).join("\n");

    const fields: DocumentOcrField[] = allElements.map((el: any) => ({
      value: el.text?.trim() ?? null,
      confidence: el.confidence ?? 0,
    }));

    const confidences = fields
      .map((f) => f.confidence)
      .filter((c) => c > 0);
    const overallConfidence =
      confidences.length > 0
        ? confidences.reduce((a, b) => a + b, 0) / confidences.length
        : 0;

    const diagnostics: OcrDiagnostics = {
      mlKitLoaded: true,
      blocksFound: blocks.length,
      linesFound: allLines.length,
      elementsFound: allElements.length,
      rawTextLength: rawText.length,
    };

    if (rawText.trim().length === 0) {
      diagnostics.error = "No document detected in the image. Please ensure the document is clearly visible and well-lit.";
    }

    return { rawText, fields, overallConfidence, diagnostics };
  } catch (e: any) {
    return {
      rawText: "",
      fields: [],
      overallConfidence: 0,
      diagnostics: {
        mlKitLoaded: false,
        blocksFound: 0,
        linesFound: 0,
        elementsFound: 0,
        rawTextLength: 0,
        error: `Unexpected error: ${e?.message ?? "Unknown"}`,
      },
    };
  }
}

export function getOcrErrorMessage(diagnostics: OcrDiagnostics): string {
  if (!diagnostics.mlKitLoaded) {
    return "Text recognition isn't available on this device. Please enter details manually.";
  }
  if (diagnostics.error) {
    return diagnostics.error;
  }
  if (diagnostics.linesFound === 0) {
    return "We couldn't detect a document in the image. Please retake the photo with the document clearly visible.";
  }
  if (diagnostics.rawTextLength < 10) {
    return "Very little text was detected. The image may be too blurry or dark. Please try again in better lighting.";
  }
  return "Text was detected but fields could not be extracted. Please enter details manually.";
}
