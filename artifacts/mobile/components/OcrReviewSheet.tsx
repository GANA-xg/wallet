import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import type { CardNetwork, OcrReviewData } from "@/types";
import { formatCardNumber, luhnCheck } from "@/services/cards/validation";

const CARD_GRADIENTS: [string, string][] = [
  ["#2A2520", "#1A1510"],
  ["#1F1B16", "#2A2520"],
  ["#1A1510", "#2A2520"],
  ["#2A2520", "#1F1B16"],
  ["#1F1B16", "#2A2520"],
  ["#1A1510", "#2A2520"],
];

interface OcrReviewSheetProps {
  data: OcrReviewData;
  onConfirm: (overrides: { nickname?: string; theme?: { gradientColors: string[] } }) => void;
  onCancel: () => void;
  onEdit?: (updated: OcrReviewData) => void;
  submitting?: boolean;
}

export default function OcrReviewSheet({ data, onConfirm, onCancel, submitting }: OcrReviewSheetProps) {
  const colors = useColors();
  const [nickname, setNickname] = useState(() => {
    if (data.issuer) return data.issuer;
    return `${capitalize(data.cardNetwork)} •••• ${data.cardNumber.slice(-4)}`;
  });
  const [selectedGrad, setSelectedGrad] = useState(0);
  const [cardNumber, setCardNumber] = useState(data.cardNumber);
  const [month, setMonth] = useState(String(data.expiryMonth).padStart(2, "0"));
  const [year, setYear] = useState(String(data.expiryYear));
  const [holderName, setHolderName] = useState(data.holderName ?? "");
  const [showEditor, setShowEditor] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const needsReview = data.lowConfidenceFields.length > 0;

  const handleEdit = () => {
    const cleaned = cardNumber.replace(/\D/g, "");
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    if (cleaned.length < 13) {
      setEditError("Card number too short");
      return;
    }
    if (!luhnCheck(cleaned)) {
      setEditError("Card number failed validation");
      return;
    }
    if (m < 1 || m > 12 || !y || y < 2024) {
      setEditError("Invalid expiry date");
      return;
    }

    setEditError(null);

    if (data.cardNumber !== cardNumber || data.expiryMonth !== m || data.expiryYear !== y) {
      const updated: OcrReviewData = {
        ...data,
        cardNumber: formatCardNumber(cleaned),
        expiryMonth: m,
        expiryYear: y,
        holderName: holderName || data.holderName,
      };
      data = updated;
    }

    setShowEditor(false);
  };

  const networkColors: Record<CardNetwork, string> = {
    visa: "#1A1F71",
    mastercard: "#EB001B",
    rupay: "#007B5E",
    amex: "#2E77BC",
    diners: "#0F4C81",
    jcb: "#0B6B3D",
    discover: "#FF6000",
    unknown: "#666",
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.text }]}>Review Card Details</Text>

      <View style={[styles.cardPreview, { backgroundColor: CARD_GRADIENTS[selectedGrad][0] }]}>
        <View style={styles.previewRow}>
          <Text style={styles.previewIssuer}>{data.issuer ?? capitalize(data.cardNetwork)}</Text>
          <Text style={styles.previewNetwork}>{data.cardNetwork.toUpperCase()}</Text>
        </View>
        <Text style={styles.previewNumber}>{cardNumber}</Text>
        <View style={styles.previewBottom}>
          <View>
            <Text style={styles.previewLabel}>EXPIRES</Text>
            <Text style={styles.previewValue}>{month}/{year.slice(-2)}</Text>
          </View>
          {holderName ? (
            <View>
              <Text style={styles.previewLabel}>HOLDER</Text>
              <Text style={styles.previewValue}>{holderName}</Text>
            </View>
          ) : null}
        </View>
        <View style={[styles.previewNetworkDot, { backgroundColor: networkColors[data.cardNetwork] }]} />
      </View>

      {needsReview && !showEditor && (
        <View style={[styles.lowConfidenceBanner, { backgroundColor: "#EAC89120" }]}>
          <Feather name="alert-triangle" size={14} color="#EAC891" />
          <Text style={styles.lowConfidenceText}>
            Some fields have low confidence — tap to verify
          </Text>
          <TouchableOpacity onPress={() => setShowEditor(true)}>
            <Text style={[styles.editLink, { color: colors.primary }]}>Edit</Text>
          </TouchableOpacity>
        </View>
      )}

      {showEditor && (
        <View style={styles.editor}>
          <Text style={[styles.editorLabel, { color: colors.mutedForeground }]}>Card Number</Text>
          <TextInput
            style={[styles.editorInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
            value={cardNumber}
            onChangeText={(t) => setCardNumber(formatCardNumber(t.replace(/\D/g, "")))}
            placeholder="0000 0000 0000 0000"
            placeholderTextColor={colors.textTertiary}
            keyboardType="number-pad"
            maxLength={23}
          />

          <View style={styles.editorRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.editorLabel, { color: colors.mutedForeground }]}>Expiry Month</Text>
              <TextInput
                style={[styles.editorInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
                value={month}
                onChangeText={setMonth}
                placeholder="MM"
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.editorLabel, { color: colors.mutedForeground }]}>Expiry Year</Text>
              <TextInput
                style={[styles.editorInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
                value={year}
                onChangeText={setYear}
                placeholder="YYYY"
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
          </View>

          <Text style={[styles.editorLabel, { color: colors.mutedForeground }]}>Cardholder Name</Text>
          <TextInput
            style={[styles.editorInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
            value={holderName}
            onChangeText={setHolderName}
            placeholder="Name on card"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="words"
          />

          {editError && (
            <Text style={styles.editError}>{editError}</Text>
          )}

          <TouchableOpacity style={[styles.applyBtn, { backgroundColor: colors.primary }]} onPress={handleEdit}>
            <Text style={styles.applyBtnText}>Apply Changes</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Nickname</Text>
      <TextInput
        style={[styles.nicknameInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, color: colors.text }]}
        value={nickname}
        onChangeText={setNickname}
        placeholder="My Card"
        placeholderTextColor={colors.textTertiary}
      />

      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Theme</Text>
      <View style={styles.themeRow}>
        {CARD_GRADIENTS.map((g, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => setSelectedGrad(i)}
            style={[styles.themeSwatch, { borderWidth: selectedGrad === i ? 2 : 0, borderColor: colors.primary }]}
          >
            <View style={[styles.themeSwatchInner, { backgroundColor: g[0] }]} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
          onPress={() => onConfirm({ nickname, theme: { gradientColors: CARD_GRADIENTS[selectedGrad] } })}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.confirmBtnText}>Add to Wallet</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  container: { borderRadius: 20, padding: 20, gap: 12, marginBottom: 20 },
  title: { fontSize: 17, fontWeight: "700", textAlign: "center" },
  cardPreview: {
    borderRadius: 18,
    padding: 20,
    height: 160,
    justifyContent: "space-between",
    position: "relative",
    overflow: "hidden",
  },
  previewRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  previewIssuer: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "600" },
  previewNetwork: { color: "rgba(255,255,255,0.6)", fontSize: 10, letterSpacing: 2 },
  previewNumber: { color: "rgba(255,255,255,0.8)", fontSize: 16, letterSpacing: 3, marginVertical: 8 },
  previewBottom: { flexDirection: "row", gap: 24 },
  previewLabel: { color: "rgba(255,255,255,0.5)", fontSize: 8, letterSpacing: 1 },
  previewValue: { color: "#FFFDF9", fontSize: 13, fontWeight: "700", marginTop: 2 },
  previewNetworkDot: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 20,
    borderRadius: 4,
    opacity: 0.6,
  },
  lowConfidenceBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 12,
    borderRadius: 12,
  },
  lowConfidenceText: { color: "#EAC891", fontSize: 12, flex: 1 },
  editLink: { fontSize: 13, fontWeight: "700" },
  editor: { gap: 8 },
  editorLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  editorInput: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    fontSize: 15,
  },
  editorRow: { flexDirection: "row", gap: 12 },
  editError: { color: "#EF4444", fontSize: 12 },
  applyBtn: { paddingVertical: 10, borderRadius: 12, alignItems: "center", marginTop: 4 },
  applyBtnText: { color: "#FFFDF9", fontSize: 14, fontWeight: "700" },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginTop: 4 },
  nicknameInput: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    fontSize: 15,
  },
  themeRow: { flexDirection: "row", gap: 10 },
  themeSwatch: { width: 40, height: 40, borderRadius: 12, overflow: "hidden", padding: 2 },
  themeSwatchInner: { flex: 1, borderRadius: 10 },
  actions: { gap: 8, marginTop: 4 },
  confirmBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  confirmBtnText: { color: "#FFFDF9", fontSize: 16, fontWeight: "700" },
  cancelBtn: { paddingVertical: 8, alignItems: "center" },
  cancelBtnText: { fontSize: 14 },
});
