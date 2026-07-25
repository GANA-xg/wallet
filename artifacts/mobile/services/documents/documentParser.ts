import type { DocumentMetadata, DocumentType } from "@/types";

export interface ParsedDocument {
  holderName: string;
  documentNumber: string;
  metadata: DocumentMetadata;
  fieldsDetected: string[];
  totalFields: number;
}

const NOISE_WORDS = /^(GOVT|GOVERNMENT|INDIA|UNION|STATE|OF|THE|AND|CARD|NUMBER|DOB|MALE|FEMALE|DATE|VALID|TILL|EXPIRY|AUTHORITY|PROOF|IDENTITY|ADDRESS|FATHER|NAME|BIRTH|ISSUE|REPUBLIC|INDIAN|CENTRAL|STATE|DISTRICT|SUB|DIVISION|OFFICE)$/i;

function extractName(lines: string[]): string {
  for (const line of lines) {
    const upper = line.toUpperCase();
    if (/\b(NAME|HOLDER|S\/O|D\/O|W\/O|FATHER|DAUGHTER|SON)\b/.test(upper)) {
      const cleaned = line
        .replace(/^(.*?(?:name|holder|s\/o|d\/o|w\/o|father|daughter|son)\s*[:\-]?\s*)/i, "")
        .trim();
      if (cleaned.length >= 2 && cleaned.length <= 60 && /[A-Za-z]/.test(cleaned)) {
        return cleaned;
      }
    }
  }

  for (const line of lines) {
    const t = line.trim();
    if (
      t.length >= 3 &&
      t.length <= 50 &&
      /^[A-Za-z\s.\-']+$/.test(t) &&
      !NOISE_WORDS.test(t) &&
      t.split(/\s+/).length >= 2
    ) {
      return t;
    }
  }

  for (const line of lines) {
    const t = line.trim();
    if (
      t.length >= 2 &&
      t.length <= 50 &&
      /^[A-Za-z\s.\-']+$/.test(t) &&
      !NOISE_WORDS.test(t)
    ) {
      return t;
    }
  }

  return "";
}

function extractDate(text: string): string | null {
  const ddmmyyyy = text.match(/\b(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})\b/);
  if (ddmmyyyy) return ddmmyyyy[1];

  const mmyyyy = text.match(/\b(\d{2}[\/\-\.]\d{4})\b/);
  if (mmyyyy) return mmyyyy[1];

  return null;
}

function extractDateFromLabel(lines: string[], label: string): string | null {
  for (const line of lines) {
    if (new RegExp(label, "i").test(line)) {
      const date = extractDate(line);
      if (date) return date;
    }
  }
  return null;
}

function extractAadhaar(lines: string[], allText: string): ParsedDocument {
  const numberMatch = allText.match(/\b\d{4}\s?\d{4}\s?\d{4}\b/);
  const documentNumber = numberMatch?.[0]?.replace(/\s/g, "") ?? "";
  const holderName = extractName(lines);

  const dobFromLabel = extractDateFromLabel(lines, "dob|date of birth|birth");
  const dobStandalone = extractDate(allText);
  const dateOfBirth = dobFromLabel ?? dobStandalone;

  const genderMatch = allText.match(/\b(MALE|FEMALE|TRANSGENDER)\b/i);

  const addressLines: string[] = [];
  let inAddress = false;
  for (const line of lines) {
    const upper = line.toUpperCase();
    if (upper.includes("ADDRESS") || upper.includes("C/O") || upper.includes("S/O") || upper.includes("D/O")) {
      inAddress = true;
      const cleaned = line.replace(/^(.*?(?:address|c\/o|s\/o|d\/o)\s*[:\-]?\s*)/i, "").trim();
      if (cleaned.length > 3) addressLines.push(cleaned);
      continue;
    }
    if (inAddress) {
      if (/^\d{6}$/.test(line.trim())) {
        addressLines.push(line.trim());
        inAddress = false;
        continue;
      }
      if (line.trim().length > 3 && !/(DOB|MALE|FEMALE|UIDAI|GOVT)/i.test(line)) {
        addressLines.push(line.trim());
      } else {
        inAddress = false;
      }
    }
  }

  const fieldsDetected: string[] = [];
  if (holderName) fieldsDetected.push("holderName");
  if (documentNumber) fieldsDetected.push("documentNumber");
  if (dateOfBirth) fieldsDetected.push("dateOfBirth");
  if (genderMatch) fieldsDetected.push("gender");
  if (addressLines.length > 0) fieldsDetected.push("address");

  return {
    holderName,
    documentNumber,
    metadata: {
      holderName,
      dateOfBirth: dateOfBirth ?? undefined,
      gender: genderMatch?.[1]?.toUpperCase() ?? undefined,
      address: addressLines.length > 0 ? addressLines.join(", ") : undefined,
    },
    fieldsDetected,
    totalFields: 5,
  };
}

function extractPan(lines: string[], allText: string): ParsedDocument {
  const numberMatch = allText.match(/\b[A-Z]{5}\d{4}[A-Z]\b/);
  const documentNumber = numberMatch?.[0] ?? "";
  const holderName = extractName(lines);

  const dateOfBirth = extractDateFromLabel(lines, "dob|date of birth|birth") ?? extractDate(allText);

  let fatherName = "";
  for (const line of lines) {
    if (/father/i.test(line)) {
      const cleaned = line.replace(/^(.*?(?:father'?s?\s*name)\s*[:\-]?\s*)/i, "").trim();
      if (cleaned.length >= 2 && cleaned.length <= 60) {
        fatherName = cleaned;
        break;
      }
    }
  }

  const fieldsDetected: string[] = [];
  if (holderName) fieldsDetected.push("holderName");
  if (documentNumber) fieldsDetected.push("documentNumber");
  if (dateOfBirth) fieldsDetected.push("dateOfBirth");
  if (fatherName) fieldsDetected.push("fatherName");

  return {
    holderName,
    documentNumber,
    metadata: {
      holderName,
      fatherName: fatherName || undefined,
      dateOfBirth: dateOfBirth ?? undefined,
    },
    fieldsDetected,
    totalFields: 4,
  };
}

function extractDrivingLicense(lines: string[], allText: string): ParsedDocument {
  const numberMatch = allText.match(/\b[A-Z]{2}[-\s]?\d{2}[-\s]?\d{4}[-\s]?\d{7}\b/i)
    ?? allText.match(/\bDL[-\s]?\d{2}[-\s]?\d{4}[-\s]?\d{7}\b/i);
  const documentNumber = numberMatch?.[0]?.replace(/\s/g, "") ?? "";
  const holderName = extractName(lines);

  const issueDate = extractDateFromLabel(lines, "valid from|issue date|issued on");
  const expiryDate = extractDateFromLabel(lines, "valid upto|valid until|valid till|expiry|exp date|valid up to");

  let vehicleClass = "";
  for (const line of lines) {
    if (/class\s*(?:of\s*vehicle|type)/i.test(line)) {
      const cleaned = line.replace(/^(.*?(?:class\s*(?:of\s*vehicle|type)?)\s*[:\-]?\s*)/i, "").trim();
      if (cleaned.length > 0) {
        vehicleClass = cleaned;
        break;
      }
    }
  }
  if (!vehicleClass) {
    const classMatch = allText.match(/\b(LMV|MCWG|MCWOG|HGMV|LMV-NT|MCW|HMV|Transport Vehicle)\b/i);
    if (classMatch) vehicleClass = classMatch[1].toUpperCase();
  }

  const fieldsDetected: string[] = [];
  if (holderName) fieldsDetected.push("holderName");
  if (documentNumber) fieldsDetected.push("documentNumber");
  if (issueDate) fieldsDetected.push("issueDate");
  if (expiryDate) fieldsDetected.push("expiryDate");
  if (vehicleClass) fieldsDetected.push("vehicleClass");

  return {
    holderName,
    documentNumber,
    metadata: {
      holderName,
      issueDate: issueDate ?? undefined,
      expiryDate: expiryDate ?? undefined,
      vehicleClass: vehicleClass || undefined,
    },
    fieldsDetected,
    totalFields: 5,
  };
}

function parseMrzLine(line: string): { fields: string[] } | null {
  if (line.length < 30) return null;
  if (!/^[A-Z0-9<]+$/.test(line)) return null;
  const fields = line.split("<").filter((f) => f.length > 0);
  return { fields };
}

function extractPassport(lines: string[], allText: string): ParsedDocument {
  let holderName = "";
  let documentNumber = "";
  let dateOfBirth = "";
  let expiryDate = "";
  let nationality = "";

  const mrzLine1 = lines.find((l) => /^P[<]/.test(l));
  const mrzLine2 = lines.find((l) => /^\d{9}/.test(l) || /^[A-Z]{3}\d{7}/.test(l));

  if (mrzLine1 && mrzLine2) {
    const namePart = mrzLine1.replace(/^P[A-Z]?<</, "").replace(/</g, " ").trim();
    holderName = namePart;

    const numberMatch = mrzLine2.match(/^([A-Z0-9]{9})/);
    if (numberMatch) documentNumber = numberMatch[1];

    const dobMatch = mrzLine2.match(/\d{6}/);
    if (dobMatch) {
      const raw = dobMatch[0];
      const year = parseInt(raw.slice(0, 2), 10);
      const month = raw.slice(2, 4);
      const day = raw.slice(4, 6);
      const fullYear = year > 50 ? 1900 + year : 2000 + year;
      dateOfBirth = `${day}/${month}/${fullYear}`;
    }

    const expiryMatch = mrzLine2.match(/\d{6}/g);
    if (expiryMatch && expiryMatch.length >= 2) {
      const raw = expiryMatch[expiryMatch.length - 1];
      const year = parseInt(raw.slice(0, 2), 10);
      const month = raw.slice(2, 4);
      const day = raw.slice(4, 6);
      const fullYear = year > 50 ? 1900 + year : 2000 + year;
      expiryDate = `${day}/${month}/${fullYear}`;
    }
  } else {
    holderName = extractName(lines);
    documentNumber = allText.match(/\b[A-Z]\d{7}\b/)?.[0] ?? "";
    dateOfBirth = extractDateFromLabel(lines, "dob|date of birth|birth") ?? extractDate(allText) ?? "";
    expiryDate = extractDateFromLabel(lines, "expiry|exp|valid until|valid upto") ?? "";
  }

  const nationalityMatch = allText.match(/\b(INDIAN|INDIA|NATIONALITY)\s*[:\-]?\s*([A-Z]+)/i)
    ?? allText.match(/\b(IND)\b/);
  if (nationalityMatch) {
    nationality = nationalityMatch[2]?.toUpperCase() ?? nationalityMatch[1]?.toUpperCase() ?? "";
  }

  const fieldsDetected: string[] = [];
  if (holderName) fieldsDetected.push("holderName");
  if (documentNumber) fieldsDetected.push("documentNumber");
  if (dateOfBirth) fieldsDetected.push("dateOfBirth");
  if (expiryDate) fieldsDetected.push("expiryDate");
  if (nationality) fieldsDetected.push("nationality");

  return {
    holderName,
    documentNumber,
    metadata: {
      holderName,
      dateOfBirth: dateOfBirth || undefined,
      expiryDate: expiryDate || undefined,
      nationality: nationality || undefined,
      passportNumber: documentNumber || undefined,
    },
    fieldsDetected,
    totalFields: 5,
  };
}

function extractVehicleRc(lines: string[], allText: string): ParsedDocument {
  const numberMatch = allText.match(/\b[A-Z]{2}[-\s]?\d{2}[-\s]?[A-Z]{1,2}[-\s]?\d{4}\b/);
  const documentNumber = numberMatch?.[0]?.replace(/\s/g, "") ?? "";
  const holderName = extractName(lines);

  let vehicleModel = "";
  for (const line of lines) {
    if (/vehicle\s*(?:make|model|name)|car\s*model|bike|maker/i.test(line)) {
      const cleaned = line.replace(/^(.*?(?:vehicle\s*(?:make|model|name)|car\s*model|bike|maker)\s*[:\-]?\s*)/i, "").trim();
      if (cleaned.length > 0) {
        vehicleModel = cleaned;
        break;
      }
    }
  }

  const fuelMatch = allText.match(/\b(PETROL|DIESEL|CNG|ELECTRIC|HYBRID|LPG|EV)\b/i);

  const chassisMatch = allText.match(/(?:chassis\s*(?:no|number|\.))\s*[:\-]?\s*([A-Z0-9]+)/i);
  const engineMatch = allText.match(/(?:engine\s*(?:no|number|\.))\s*[:\-]?\s*([A-Z0-9]+)/i);

  const fieldsDetected: string[] = [];
  if (holderName) fieldsDetected.push("holderName");
  if (documentNumber) fieldsDetected.push("documentNumber");
  if (vehicleModel) fieldsDetected.push("vehicleModel");
  if (fuelMatch) fieldsDetected.push("fuelType");
  if (chassisMatch) fieldsDetected.push("chassisNumber");
  if (engineMatch) fieldsDetected.push("engineNumber");

  return {
    holderName,
    documentNumber,
    metadata: {
      holderName,
      registrationNumber: documentNumber || undefined,
      vehicleModel: vehicleModel || undefined,
      fuelType: fuelMatch?.[1]?.toUpperCase() ?? undefined,
      chassisNumber: chassisMatch?.[1] ?? undefined,
      engineNumber: engineMatch?.[1] ?? undefined,
    },
    fieldsDetected,
    totalFields: 6,
  };
}

function extractMembership(lines: string[], allText: string): ParsedDocument {
  const holderName = extractName(lines);

  let memberId = "";
  for (const line of lines) {
    if (/member(?:ship)?\s*(?:id|no|number|#)/i.test(line)) {
      const cleaned = line.replace(/^(.*?(?:member(?:ship)?\s*(?:id|no|number|#))\s*[:\-]?\s*)/i, "").trim();
      if (cleaned.length > 0) {
        memberId = cleaned;
        break;
      }
    }
  }
  if (!memberId) {
    const idMatch = allText.match(/\b(?:MEM|MBR|ID)[-\s]?\d{4,}\b/i);
    if (idMatch) memberId = idMatch[0];
  }

  let organization = "";
  for (const line of lines) {
    if (/(?:club|association|organization|society|institute)/i.test(line)) {
      const t = line.trim();
      if (t.length >= 3 && t.length <= 60) {
        organization = t;
        break;
      }
    }
  }

  const expiryDate = extractDateFromLabel(lines, "valid upto|valid until|valid till|expiry|exp date|valid up to|valid thru");

  const fieldsDetected: string[] = [];
  if (holderName) fieldsDetected.push("holderName");
  if (memberId) fieldsDetected.push("documentNumber");
  if (organization) fieldsDetected.push("organization");
  if (expiryDate) fieldsDetected.push("expiryDate");

  return {
    holderName,
    documentNumber: memberId,
    metadata: {
      holderName,
      organization: organization || undefined,
      expiryDate: expiryDate ?? undefined,
    },
    fieldsDetected,
    totalFields: 4,
  };
}

function extractCollegeId(lines: string[], allText: string): ParsedDocument {
  const holderName = extractName(lines);

  let studentId = "";
  for (const line of lines) {
    if (/roll\s*(?:no|number|#)|student\s*(?:id|no|number|#)|reg(?:istration)?\s*(?:no|number)/i.test(line)) {
      const cleaned = line.replace(/^(.*?(?:roll|student|reg(?:istration)?)\s*(?:no|number|#|id)\s*[:\-]?\s*)/i, "").trim();
      if (cleaned.length > 0) {
        studentId = cleaned;
        break;
      }
    }
  }
  if (!studentId) {
    const idMatch = allText.match(/\b\d{2}[A-Z]{2}\d{4,}\b/);
    if (idMatch) studentId = idMatch[0];
  }

  let organization = "";
  for (const line of lines) {
    if (/(?:college|university|institute|school|academy)/i.test(line)) {
      const t = line.trim();
      if (t.length >= 3 && t.length <= 80) {
        organization = t;
        break;
      }
    }
  }

  let department = "";
  for (const line of lines) {
    if (/(?:department|dept|branch|stream)/i.test(line)) {
      const cleaned = line.replace(/^(.*?(?:department|dept|branch|stream)\s*[:\-]?\s*)/i, "").trim();
      if (cleaned.length > 0) {
        department = cleaned;
        break;
      }
    }
  }

  const expiryDate = extractDateFromLabel(lines, "valid upto|valid until|valid till|expiry|valid up to|valid thru|valid for");

  const fieldsDetected: string[] = [];
  if (holderName) fieldsDetected.push("holderName");
  if (studentId) fieldsDetected.push("documentNumber");
  if (organization) fieldsDetected.push("organization");
  if (department) fieldsDetected.push("department");
  if (expiryDate) fieldsDetected.push("expiryDate");

  return {
    holderName,
    documentNumber: studentId,
    metadata: {
      holderName,
      organization: organization || undefined,
      expiryDate: expiryDate ?? undefined,
      customFields: department ? { Department: department } : undefined,
    },
    fieldsDetected,
    totalFields: 5,
  };
}

function extractGeneric(lines: string[], allText: string): ParsedDocument {
  const holderName = extractName(lines);
  const numberPatterns = [
    /\b[A-Z]{5}\d{4}[A-Z]\b/,
    /\b[A-Z]\d{7}\b/,
    /\b\d{4}\s?\d{4}\s?\d{4}\b/,
    /\b[A-Z]{2}[-\s]?\d{2}[-\s]?[A-Z]{1,2}[-\s]?\d{4}\b/,
  ];

  let documentNumber = "";
  for (const pat of numberPatterns) {
    const m = allText.match(pat);
    if (m) {
      documentNumber = m[0].replace(/\s/g, "");
      break;
    }
  }

  if (!documentNumber) {
    for (const line of lines) {
      if (/(?:id|number|no|ref)\s*[:\-]/i.test(line)) {
        const cleaned = line.replace(/^.*[:\-]\s*/, "").trim();
        if (cleaned.length > 0) {
          documentNumber = cleaned;
          break;
        }
      }
    }
  }

  const dateOfBirth = extractDateFromLabel(lines, "dob|date of birth|birth") ?? extractDate(allText);

  const fieldsDetected: string[] = [];
  if (holderName) fieldsDetected.push("holderName");
  if (documentNumber) fieldsDetected.push("documentNumber");
  if (dateOfBirth) fieldsDetected.push("dateOfBirth");

  return {
    holderName,
    documentNumber,
    metadata: {
      holderName,
      dateOfBirth: dateOfBirth ?? undefined,
      customFields: { rawText: allText.slice(0, 500) },
    },
    fieldsDetected,
    totalFields: 3,
  };
}

export function parseDocumentText(
  type: DocumentType,
  rawText: string,
): ParsedDocument {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  switch (type) {
    case "aadhaar":
      return extractAadhaar(lines, rawText);
    case "pan":
      return extractPan(lines, rawText);
    case "driving_license":
      return extractDrivingLicense(lines, rawText);
    case "passport":
      return extractPassport(lines, rawText);
    case "vehicle_rc":
      return extractVehicleRc(lines, rawText);
    case "membership":
      return extractMembership(lines, rawText);
    case "college_id":
      return extractCollegeId(lines, rawText);
    default:
      return extractGeneric(lines, rawText);
  }
}
