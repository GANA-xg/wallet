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

// ─── Category heuristic (shared with app/subscriptions.tsx) ──

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  apps: ["apple", "google", "microsoft", "adobe", "notion", "figma", "slack", "zoom", "dropbox", "github", "vercel", "netlify", "1password", "bitwarden", "clickup", "miro", "atlassian", "jira"],
  media: ["spotify", "netflix", "youtube", "hotstar", "prime", "disney", "jio", "gaana", "wynk", "audible", "apple music", "hulu", "paramount", "hbo", "sony liv", "zee5", "mx player", "podcast", "music"],
  tools: ["chatgpt", "openai", "midjourney", "canva", "grammarly", "todoist", "trello", "asana", "linear", "cursor", "copilot", "replit", "ai", "pro"],
  bills: ["electricity", "water", "gas", "internet", "broadband", "jio fiber", "airtel", "vi", "bsnl", "insurance", "rent", "maintenance", "society"],
};

function classifyMerchant(merchantName: string): string {
  const lower = merchantName.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return category;
    }
  }
  return "other";
}

function categoryColor(cat: string): string {
  switch (cat) {
    case "apps": return "#FF385C";
    case "media": return "#754F4D";
    case "tools": return "#2E7D32";
    case "bills": return "#B8860B";
    default: return "#6B7280";
  }
}

function categoryIcon(cat: string): keyof typeof Feather.glyphMap {
  switch (cat) {
    case "apps": return "grid";
    case "media": return "play";
    case "tools": return "tool";
    case "bills": return "file-text";
    default: return "more-horizontal";
  }
}

function statusColor(status: string): string {
  switch (status) {
    case "active": return "#10B981";
    case "cancelled_by_user": return "#EF4444";
    case "ignored": return "#6B7280";
    default: return "#6B7280";
  }
}

function formatAmount(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ─── Types ────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────

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

  // Derived values
  const cat = classifyMerchant(subscription.merchant);
  const catCol = categoryColor(cat);
  const catIcon = categoryIcon(cat);
  const d = daysUntil(subscription.next_charge_date);
  const dColor = d !== null ? (d <= 3 ? "#EF4444" : d <= 7 ? "#B8860B" : "#10B981") : "#6B7280";
  const StatusDotColor = statusColor(subscription.status);

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

          {/* Status banner */}
          <View style={[styles.statusBanner, { backgroundColor: StatusDotColor + "15" }]}>
            <View style={[styles.statusBannerDot, { backgroundColor: StatusDotColor }]} />
            <Text style={[styles.statusBannerText, { color: StatusDotColor }]}>
              {isActive ? "Active Subscription" : isCancelled ? "Cancelled" : "Ignored"}
            </Text>
          </View>

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
          {subscription.cadence === "yearly" && (
            <Text style={[styles.monthlyEquiv, { color: colors.textSecondary }]}>
              ≈ {formatAmount(Math.round(subscription.amount_paise / 12))}/month
            </Text>
          )}

          {/* Info section — next charge + days remaining */}
          {subscription.next_charge_date && (
            <View style={[styles.infoSection, { backgroundColor: colors.surfaceElevated }]}>
              <View style={styles.infoRow}>
                <Feather name="calendar" size={16} color={colors.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Next charge</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {new Date(subscription.next_charge_date).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </Text>
                </View>
              </View>
              <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
              <View style={styles.infoRow}>
                <Feather name="clock" size={16} color={dColor} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Days remaining</Text>
                  <Text style={[styles.infoValue, { color: dColor }]}>
                    {d === 0 ? "Charges today" : d !== null ? `${d} days` : "—"}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Category */}
          <View style={styles.categorySection}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Category</Text>
            <View style={[styles.categoryDisplay, { backgroundColor: catCol + "15" }]}>
              <Feather name={catIcon} size={14} color={catCol} />
              <Text style={[styles.categoryDisplayText, { color: catCol }]}>{cat}</Text>
            </View>
          </View>

          {/* Status action buttons */}
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

// ─── Styles ────────────────────────────────────────────

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

  // Status banner
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.base,
  },
  statusBannerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusBannerText: {
    fontSize: 13,
    fontWeight: "700",
  },

  // Merchant
  merchantName: {
    fontSize: 22,
    fontWeight: "800",
    textTransform: "capitalize",
    marginBottom: spacing.sm,
  },

  // Amount
  amountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.sm,
    marginBottom: spacing.sm,
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
  monthlyEquiv: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: -spacing.xs,
    marginBottom: spacing.base,
  },

  // Info section
  infoSection: {
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.base,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  infoDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.md,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "700",
  },

  // Category
  categorySection: {
    marginBottom: spacing.base,
  },
  categoryDisplay: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
  },
  categoryDisplayText: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "capitalize",
  },

  // Status
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

  // Delete
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
