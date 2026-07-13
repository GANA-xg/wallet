import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { CardError } from "@/types";

interface QualityFeedbackProps {
  error: CardError;
  onRetake: () => void;
  onCancel: () => void;
}

export default function QualityFeedback({ error, onRetake, onCancel }: QualityFeedbackProps) {
  const colors = useColors();

  const icon = getIconForError(error.code);
  const title = getTitleForError(error.code);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: "#F59E0B20" }]}>
          <Feather name={icon} size={28} color="#F59E0B" />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.message, { color: colors.mutedForeground }]}>
          {error.message}
        </Text>
        {error.suggestion && (
          <Text style={[styles.suggestion, { color: colors.mutedForeground }]}>
            {error.suggestion}
          </Text>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.retakeBtn, { backgroundColor: colors.primary }]}
          onPress={onRetake}
        >
          <Feather name="camera" size={16} color="#fff" />
          <Text style={styles.retakeBtnText}>Try Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function getIconForError(code: string): "camera-off" | "sun" | "maximize" | "refresh-cw" | "alert-triangle" {
  if (code.includes("blur")) return "refresh-cw";
  if (code.includes("light")) return "sun";
  if (code.includes("glare")) return "sun";
  if (code.includes("orientation") || code.includes("position")) return "maximize";
  return "alert-triangle";
}

function getTitleForError(code: string): string {
  if (code.includes("blur")) return "Too Blurry";
  if (code.includes("light")) return "Too Dark";
  if (code.includes("glare")) return "Too Much Glare";
  if (code.includes("orientation")) return "Wrong Angle";
  if (code.includes("position")) return "Reposition Card";
  return "Scan Quality Issue";
}

const styles = StyleSheet.create({
  container: { borderRadius: 20, padding: 24, gap: 20, marginBottom: 20 },
  content: { alignItems: "center", gap: 8 },
  iconWrap: { width: 56, height: 56, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 17, fontWeight: "700", textAlign: "center" },
  message: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  suggestion: { fontSize: 12, textAlign: "center", fontStyle: "italic" },
  actions: { gap: 8 },
  retakeBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  retakeBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  cancelBtn: { paddingVertical: 8, alignItems: "center" },
  cancelBtnText: { fontSize: 14 },
});
