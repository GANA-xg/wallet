import * as FileSystem from "expo-file-system";

import { detectBlur, detectLowLight, detectGlare, detectOrientation } from "@/services/cards/imageQuality";

export interface DocumentQualityResult {
  passed: boolean;
  checks: {
    resolution: { passed: boolean; width: number; height: number };
    blur: { passed: boolean; score: number; threshold: number };
    brightness: { passed: boolean; score: number; threshold: number };
    glare: { passed: boolean; score: number; threshold: number };
    orientation: { passed: boolean; aspectRatio: number };
  };
  overallScore: number;
  message: string;
}

const MIN_WIDTH = 800;
const MIN_HEIGHT = 600;
const MIN_FILE_SIZE = 10240;

export async function validateDocumentImage(
  imageUri: string,
  imageWidth: number,
  imageHeight: number,
): Promise<DocumentQualityResult> {
  const defaultFail = (message: string): DocumentQualityResult => ({
    passed: false,
    checks: {
      resolution: { passed: false, width: imageWidth, height: imageHeight },
      blur: { passed: false, score: 0, threshold: 100 },
      brightness: { passed: false, score: 0, threshold: 50 },
      glare: { passed: false, score: 0, threshold: 0.1 },
      orientation: { passed: false, aspectRatio: 0 },
    },
    overallScore: 0,
    message,
  });

  try {
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    if (!fileInfo.exists || fileInfo.size < MIN_FILE_SIZE) {
      return defaultFail("The captured image is too small or corrupted. Please try again.");
    }

    const resolutionPassed = imageWidth >= MIN_WIDTH && imageHeight >= MIN_HEIGHT;
    if (!resolutionPassed) {
      return defaultFail(
        `Image resolution is too low (${imageWidth}x${imageHeight}). Please capture at a higher resolution.`,
      );
    }

    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const binaryStr = atob(base64);
    const len = binaryStr.length;
    const data = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      data[i] = binaryStr.charCodeAt(i);
    }

    const pixelData = { width: imageWidth, height: Math.min(imageHeight, Math.floor(len / 4 / imageWidth) || imageHeight), data };

    const blurResult = detectBlur(pixelData);
    const brightnessResult = detectLowLight(pixelData);
    const glareResult = detectGlare(pixelData);
    const orientationResult = detectOrientation(pixelData);

    const checks = {
      resolution: { passed: resolutionPassed, width: imageWidth, height: imageHeight },
      blur: { passed: blurResult.passed, score: blurResult.score, threshold: blurResult.threshold },
      brightness: { passed: brightnessResult.passed, score: brightnessResult.score, threshold: brightnessResult.threshold },
      glare: { passed: glareResult.passed, score: glareResult.score, threshold: glareResult.threshold },
      orientation: { passed: orientationResult.passed, aspectRatio: orientationResult.aspectRatio },
    };

    const passedChecks = Object.values(checks).filter((c) => c.passed).length;
    const totalChecks = Object.keys(checks).length;
    const overallScore = passedChecks / totalChecks;

    let message = "";
    if (!blurResult.passed) {
      message = "The captured document is too blurry to read. Hold your phone steady and try again.";
    } else if (!brightnessResult.passed) {
      message = "The image is too dark. Try again in better lighting.";
    } else if (!glareResult.passed) {
      message = "There is too much glare on the document. Tilt the card away from direct light.";
    } else if (!orientationResult.passed) {
      message = "The document appears to be at an angle. Align it parallel to the camera frame.";
    }

    const passed = overallScore >= 0.6;

    return { passed, checks, overallScore, message };
  } catch {
    return defaultFail("Could not analyze image quality. Please try again.");
  }
}
