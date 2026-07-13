import type { QualityCheckResult } from "@/types";

const BLUR_THRESHOLD = 100;
const LOW_LIGHT_THRESHOLD = 50;
const GLARE_THRESHOLD = 0.1;
const CARD_ASPECT_RATIO = 1.586;
const ASPECT_TOLERANCE = 0.15;

function getPixelData(
  imageData: { width: number; height: number; data: Uint8Array },
): { width: number; height: number; luminance: Float32Array } {
  const { width, height, data } = imageData;
  const luminance = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const offset = i * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    luminance[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }
  return { width, height, luminance };
}

export function detectBlur(imageData: {
  width: number;
  height: number;
  data: Uint8Array;
}): { score: number; threshold: number; passed: boolean } {
  const { width, height, luminance } = getPixelData(imageData);

  let sum = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const laplacian =
        luminance[idx] * 4 -
        luminance[idx - 1] -
        luminance[idx + 1] -
        luminance[idx - width] -
        luminance[idx + width];
      sum += laplacian * laplacian;
      count++;
    }
  }

  const variance = count > 0 ? sum / count : 0;
  return { score: variance, threshold: BLUR_THRESHOLD, passed: variance >= BLUR_THRESHOLD };
}

export function detectLowLight(imageData: {
  width: number;
  height: number;
  data: Uint8Array;
}): { score: number; threshold: number; passed: boolean } {
  const { luminance } = getPixelData(imageData);

  let total = 0;
  for (let i = 0; i < luminance.length; i++) {
    total += luminance[i];
  }

  const mean = luminance.length > 0 ? total / luminance.length : 0;
  return { score: mean, threshold: LOW_LIGHT_THRESHOLD, passed: mean >= LOW_LIGHT_THRESHOLD };
}

export function detectGlare(imageData: {
  width: number;
  height: number;
  data: Uint8Array;
}): { score: number; threshold: number; passed: boolean } {
  const { luminance } = getPixelData(imageData);

  let brightCount = 0;
  for (let i = 0; i < luminance.length; i++) {
    if (luminance[i] > 240) brightCount++;
  }

  const ratio = luminance.length > 0 ? brightCount / luminance.length : 0;
  return { score: ratio, threshold: GLARE_THRESHOLD, passed: ratio < GLARE_THRESHOLD };
}

export function detectOrientation(imageData: {
  width: number;
  height: number;
}): { aspectRatio: number; passed: boolean } {
  const { width, height } = imageData;
  if (height === 0) return { aspectRatio: 0, passed: false };

  const aspect = width / height;
  const expected = CARD_ASPECT_RATIO;
  const passed = Math.abs(aspect - expected) / expected < ASPECT_TOLERANCE;

  return { aspectRatio: aspect, passed };
}

export function detectCardPositioning(cardBounds: {
  x: number;
  y: number;
  width: number;
  height: number;
}): { passed: boolean } {
  const minDimension = 100;
  if (cardBounds.width < minDimension || cardBounds.height < minDimension) {
    return { passed: false };
  }

  const aspect = cardBounds.width / cardBounds.height;
  const expected = CARD_ASPECT_RATIO;
  const ratioOk = Math.abs(aspect - expected) / expected < 0.5;

  return { passed: ratioOk };
}

export function checkAllQuality(imageData: {
  width: number;
  height: number;
  data: Uint8Array;
}, cardBounds?: {
  x: number;
  y: number;
  width: number;
  height: number;
}): QualityCheckResult {
  const blur = detectBlur(imageData);
  const lowLight = detectLowLight(imageData);
  const glare = detectGlare(imageData);
  const orientation = detectOrientation(imageData);
  const positioning = cardBounds ? detectCardPositioning(cardBounds) : { passed: true };

  return {
    passed: blur.passed && lowLight.passed && glare.passed && orientation.passed && positioning.passed,
    checks: { blur, lowLight, glare, orientation, positioning },
  };
}
