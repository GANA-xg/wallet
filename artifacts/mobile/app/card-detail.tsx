import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GradientCard } from "@/components/GradientCard";
import { SectionHeader } from "@/components/SectionHeader";
import { TransactionItem } from "@/components/TransactionItem";
import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";
import BiometricPrompt from "@/app/biometric-prompt";

const { width } = Dimensions.get("window");

export default function CardDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cards, transactions, toggleFreeze, removeCard } = useWallet();
  const { verifyBiometric } = useAuth();
  const [biometricAction, setBiometricAction] = useState<"freeze" | "remove" | null>(null);

  const card = cards.find((c) => c.id === id);
  const cardTransactions = transactions.filter(() => true).slice(0, 10);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleBiometricSuccess = async () => {
    if (biometricAction === "freeze") {
      toggleFreeze(card!.id);
    } else if (biometricAction === "remove") {
      removeCard(card!.id);
      router.back();
    }
    setBiometricAction(null);
  };

  if (!card) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad + 16 }]}>
        <View style={styles.notFound}>
          <Feather name="credit-card" size={48} color={colors.mutedForeground} />
          <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>Card not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.backLink, { color: colors.primary }]}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleFreeze = () => {
    setBiometricAction("freeze");
  };

  const handleRemove = () => {
    setBiometricAction("remove");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Card Details</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardSection}>
          <GradientCard card={card} />
        </View>

        {/* Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Network</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{card.cardNetwork.toUpperCase()}</Text>
          </View>
          <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Issuer</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{card.issuer ?? "Unknown"}</Text>
          </View>
          <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Expires</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {String(card.expiryMonth).padStart(2, "0")}/{card.expiryYear}
            </Text>
          </View>
          <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Status</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: card.frozen ? "#EF4444" : "#22C55E" }]} />
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {card.frozen ? "Frozen" : "Active"}
              </Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: card.frozen ? "#0a1a10" : "#1a0808" }]}
            onPress={handleFreeze}
          >
            <Feather name={card.frozen ? "unlock" : "lock"} size={18} color={card.frozen ? "#22C55E" : "#EF4444"} />
            <Text style={[styles.actionBtnText, { color: card.frozen ? "#22C55E" : "#EF4444" }]}>
              {card.frozen ? "Unfreeze Card" : "Freeze Card"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#1a0808" }]}
            onPress={handleRemove}
          >
            <Feather name="trash-2" size={18} color="#EF4444" />
            <Text style={[styles.actionBtnText, { color: "#EF4444" }]}>Remove Card</Text>
          </TouchableOpacity>
        </View>

        {/* Transactions */}
        <View style={styles.txSection}>
          <SectionHeader title="Recent Activity" actionLabel="See All" onAction={() => router.push("/(tabs)/transactions")} />
          <View style={[styles.txCard, { backgroundColor: colors.surface, borderRadius: 20 }]}>
            {cardTransactions.length > 0 ? (
              cardTransactions.map((tx) => (
                <TransactionItem key={tx.id} transaction={tx} />
              ))
            ) : (
              <View style={styles.txEmpty}>
                <Text style={[styles.txEmptyText, { color: colors.mutedForeground }]}>
                  No transactions yet
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <BiometricPrompt
        visible={biometricAction !== null}
        title={biometricAction === "freeze" ? (card.frozen ? "Unfreeze Card" : "Freeze Card") : "Remove Card"}
        subtitle={biometricAction === "freeze" ? "Authorize with biometrics to change card status" : "Authorize with biometrics to remove this card"}
        onSuccess={handleBiometricSuccess}
        onCancel={() => setBiometricAction(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: { width: 32, height: 32, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700" },
  notFound: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  notFoundText: { fontSize: 16 },
  backLink: { fontSize: 15, fontWeight: "600", marginTop: 8 },
  cardSection: { paddingHorizontal: 24, marginBottom: 24, alignItems: "center" },
  infoCard: { marginHorizontal: 20, borderRadius: 20, borderWidth: 1, overflow: "hidden", marginBottom: 20 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 },
  infoLabel: { fontSize: 13, fontWeight: "500" },
  infoValue: { fontSize: 14, fontWeight: "700" },
  infoDivider: { height: 1, marginHorizontal: 16 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  actions: { paddingHorizontal: 20, gap: 10, marginBottom: 24 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionBtnText: { fontSize: 15, fontWeight: "700" },
  txSection: { paddingHorizontal: 20 },
  txCard: { paddingHorizontal: 16, overflow: "hidden" },
  txEmpty: { paddingVertical: 24, alignItems: "center" },
  txEmptyText: { fontSize: 14 },
});
