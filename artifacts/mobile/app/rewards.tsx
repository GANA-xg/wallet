import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";

export default function RewardsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { rewards } = useWallet();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const pointsReward = rewards.find((r) => r.type === "points");
  const otherRewards = rewards.filter((r) => r.type !== "points");

  const handleCopy = (id: string, code: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopiedId(id);
    Alert.alert("Copied!", `Code "${code}" copied to clipboard`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Rewards</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Points Banner */}
      {pointsReward && (
        <LinearGradient colors={[colors.sunset, colors.sunsetDark]} style={styles.pointsBanner}>
          <View>
            <Text style={styles.pointsLabel}>Vault Points</Text>
            <Text style={styles.pointsValue}>
              {(pointsReward.points ?? 0).toLocaleString("en-IN")}
            </Text>
            <Text style={styles.pointsSub}>≈ ₹{Math.round((pointsReward.points ?? 0) * 0.25)} cashback value</Text>
          </View>
          <View style={styles.pointsRight}>
            <Feather name="star" size={48} color="rgba(255,255,255,0.2)" />
          </View>
        </LinearGradient>
      )}

      {/* Rewards */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Offers</Text>
      <View style={styles.rewardGrid}>
        {otherRewards.map((reward) => (
          <View
            key={reward.id}
            style={[styles.rewardCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.rewardTop}>
              <View style={[styles.rewardIcon, { backgroundColor: reward.color + "20" }]}>
                <Feather
                  name={reward.type === "coupon" ? "tag" : reward.type === "cashback" ? "dollar-sign" : "gift"}
                  size={18}
                  color={reward.color}
                />
              </View>
              <View style={styles.rewardBrandWrap}>
                <Text style={[styles.rewardBrand, { color: reward.color }]}>{reward.brand}</Text>
                <Text style={[styles.rewardType, { color: colors.mutedForeground }]}>
                  {reward.type.charAt(0).toUpperCase() + reward.type.slice(1)}
                </Text>
              </View>
            </View>

            <Text style={[styles.rewardName, { color: colors.text }]}>{reward.name}</Text>

            {reward.discount && (
              <Text style={[styles.rewardDiscount, { color: reward.color }]}>{reward.discount}</Text>
            )}

            {reward.expiry && (
              <View style={styles.expiryRow}>
                <Feather name="clock" size={11} color={colors.textTertiary} />
                <Text style={[styles.expiryText, { color: colors.textTertiary }]}>
                  Expires {reward.expiry}
                </Text>
              </View>
            )}

            {reward.code && (
              <TouchableOpacity
                style={[styles.codeBtn, { borderColor: reward.color + "60", backgroundColor: reward.color + "10" }]}
                onPress={() => handleCopy(reward.id, reward.code!)}
              >
                <Text style={[styles.code, { color: reward.color }]}>{reward.code}</Text>
                <Feather
                  name={copiedId === reward.id ? "check" : "copy"}
                  size={14}
                  color={reward.color}
                />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      {/* How to Use */}
      <View style={[styles.howToCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.howToTitle, { color: colors.text }]}>How to redeem?</Text>
        {[
          { step: "1", text: "Copy the coupon code" },
          { step: "2", text: "Paste at checkout on the partner app" },
          { step: "3", text: "Discount is applied automatically" },
        ].map((item) => (
          <View key={item.step} style={styles.howToRow}>
            <View style={[styles.stepCircle, { backgroundColor: colors.primary }]}>
              <Text style={styles.stepNum}>{item.step}</Text>
            </View>
            <Text style={[styles.stepText, { color: colors.mutedForeground }]}>{item.text}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 0 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: "800" },
  pointsBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    overflow: "hidden",
  },
  pointsLabel: { color: "#FFFDF9", fontSize: 12, fontWeight: "600", letterSpacing: 1, opacity: 0.7 },
  pointsValue: { color: "#FFFDF9", fontSize: 40, fontWeight: "900", marginVertical: 4 },
  pointsSub: { color: "#FFFDF9", fontSize: 13, opacity: 0.7 },
  pointsRight: { opacity: 0.4 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 14 },
  rewardGrid: { gap: 12, marginBottom: 24 },
  rewardCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 10,
  },
  rewardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  rewardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  rewardBrandWrap: {},
  rewardBrand: { fontSize: 13, fontWeight: "800" },
  rewardType: { fontSize: 11, marginTop: 1 },
  rewardName: { fontSize: 15, fontWeight: "700" },
  rewardDiscount: { fontSize: 22, fontWeight: "900" },
  expiryRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  expiryText: { fontSize: 12 },
  codeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  code: { fontSize: 14, fontWeight: "800", letterSpacing: 1.5 },
  howToCard: { borderRadius: 16, padding: 16, gap: 12 },
  howToTitle: { fontSize: 15, fontWeight: "700" },
  howToRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  stepNum: { color: "#FFFDF9", fontSize: 12, fontWeight: "800" },
  stepText: { fontSize: 14 },
});
