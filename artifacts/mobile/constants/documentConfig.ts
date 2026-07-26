import { Feather } from "@expo/vector-icons";
import type { DocumentType } from "@/types";

export const DOC_CONFIG: Record<DocumentType, { label: string; icon: keyof typeof Feather.glyphMap; color: string }> = {
  aadhaar: { label: "Aadhaar Card", icon: "credit-card", color: "#D06224" },
  pan: { label: "PAN Card", icon: "credit-card", color: "#EAC891" },
  driving_license: { label: "Driving License", icon: "navigation", color: "#2E7D32" },
  passport: { label: "Passport", icon: "globe", color: "#AE431E" },
  vehicle_rc: { label: "Vehicle RC", icon: "truck", color: "#D06224" },
  membership: { label: "Membership", icon: "award", color: "#754F4D" },
  college_id: { label: "College ID", icon: "book-open", color: "#2E7D32" },
  custom: { label: "Document", icon: "file-text", color: "#6B6B6B" },
};
