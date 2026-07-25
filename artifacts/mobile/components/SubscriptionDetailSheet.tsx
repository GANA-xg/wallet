import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import spacing from "@/constants/spacing";
import radius from "@/constants/radius";

interface SubscriptionItem {
  id: string;
  merchant: string;
  amount_paise: number;
  cadence: string;
  status: string;
  next_charge_date?: string | null;
  detected_from_txn_id?: string | null;
  createdAt?: string;
}

interface Props {
  visible: boolean;
  subscription: SubscriptionItem | null;
  onClose: () => void;
  onUpdateStatus: (id: string, status: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function formatAmount(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default function SubscriptionDetailSheet({
  visible,
  subscription,
  onClose,
  onUpdateStatus,
  onDelete,
}: Props) {
  const colors = useColors();
  const [updating, setUpdating] = useState<string | null>(null);

  if (!subscription) return null;

  const isActive = subscription.status === "active";
  const isCancelled = subscription.status === "cancelled_by_user";
  const isIgnored = subscription.status === "ignored";

  const handleStatus = async (status: string) => {
    setUpdating(status);
    try {
      await onUpdateStatus(subscription.id, status);
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Remove Subscription",
      `Remove "${subscription.merchant}" from your subscriptions?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => onDelete(subscription.id),
        },
      ],
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.mutedForeground }]} />

          {/* Merchant */}
          <Text style={[styles.merchantName, { color: colors.text }]}>
            {subscription.merchant}
          </Text>

          {/* Amount + Cadence */}
          <View style={styles.amountRow}>
            <Text style={[styles.amount, { color: colors.text }]}>
              {formatAmount(subscription.amount_paise)}
            </Text>
            <View style={[styles.cadenceBadge, { backgroundColor: colors.surfaceElevated }]}>
              <Text style={[styles.cadenceText, { color: colors.primary }]}>
                / {subscription.cadence === "monthly" ? "month" : "year"}
              </Text>
            </View>
          </View>

          {/* Next charge */}
          {subscription.next_charge_date && (
            <View style={styles.infoRow}>
              <Feather name="calendar" size={14} color={colors.mutedForeground} />
              <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                Next: {new Date(subscription.next_charge_date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
              </Text>
            </View>
          )}

          {/* Status section */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Status</Text>
          <View style={styles.statusRow}>
            <TouchableOpacity
              style={[
                styles.statusBtn,
                { borderColor: isActive ? colors.primary : colors.border },
                isActive && { backgroundColor: colors.primary + "20" },
              ]}
              onPress={() => !isActive && handleStatus("active")}
              disabled={isActive || updating !== null}
            >
              <Text style={[styles.statusBtnText, { color: isActive ? colors.primary : colors.textSecondary }]}>
                {isActive ? "✓ Active" : "Mark Active"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statusBtn,
                { borderColor: isCancelled ? "#EF4444" : colors.border },
                isCancelled && { backgroundColor: "#EF444420" },
              ]}
              onPress={() => !isCancelled && handleStatus("cancelled_by_user")}
              disabled={isCancelled || updating !== null}
            >
              <Text style={[styles.statusBtnText, { color: isCancelled ? "#EF4444" : colors.textSecondary }]}>
                {isCancelled ? "✕ Cancelled" : "Cancel"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statusBtn,
                { borderColor: isIgnored ? "#6B7280" : colors.border },
                isIgnored && { backgroundColor: "#6B728020" },
              ]}
              onPress={() => !isIgnored && handleStatus("ignored")}
              disabled={isIgnored || updating !== null}
            >
              <Text style={[styles.statusBtnText, { color: isIgnored ? "#6B7280" : colors.textSecondary }]}>
                {isIgnored ? "− Ignored" : "Ignore"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Remove button */}
          <TouchableOpacity
            style={[styles.deleteBtn, { borderColor: colors.border }]}
            onPress={handleDelete}
          >
            <Feather name="trash-2" size={16} color="#EF4444" />
            <Text style={styles.deleteText}>Remove Subscription</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    padding: spacing.lg,
    paddingBottom: spacing.xl + 20,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radius.full,
    alignSelf: "center",
    marginBottom: spacing.lg,
  },
  merchantName: {
    fontSize: 22,
    fontWeight: "800",
    textTransform: "capitalize",
    marginBottom: spacing.sm,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  amount: {
    fontSize: 32,
    fontWeight: "800",
  },
  cadenceBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  cadenceText: {
    fontSize: 13,
    fontWeight: "700",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  infoText: {
    fontSize: 14,
    fontWeight: "500",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  statusRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statusBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  statusBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  deleteText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "600",
  },
});
