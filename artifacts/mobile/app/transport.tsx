import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";
import type { TransportPass } from "@/types";

const TYPE_LABELS: Record<TransportPass["type"], string> = {
  metro: "Metro Card",
  bus: "Bus Pass",
  monthly: "Monthly Pass",
  student: "Student Pass",
};

const TYPE_ICONS: Record<TransportPass["type"], keyof typeof Feather.glyphMap> = {
  metro: "navigation",
  bus: "truck",
  monthly: "calendar",
  student: "book-open",
};

function PassCard({ pass, onTopUp }: { pass: TransportPass; onTopUp: () => void }) {
  const colors = useColors();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isLow = pass.balance < 100;

  useEffect(() => {
    if (isLow) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [isLow]);

  return (
    <View style={styles.passWrap}>
      <LinearGradient
        colors={pass.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.passCard}
      >
        {/* Header */}
        <View style={styles.passTop}>
          <View style={[styles.passTypeIcon, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
            <Feather name={TYPE_ICONS[pass.type]} size={18} color="#fff" />
          </View>
          <View>
            <Text style={styles.passType}>{TYPE_LABELS[pass.type]}</Text>
            <Text style={styles.passCity}>{pass.city}</Text>
          </View>

          {isLow && (
            <Animated.View style={[styles.lowBadge, { transform: [{ scale: pulseAnim }] }]}>
              <Text style={styles.lowBadgeText}>LOW</Text>
            </Animated.View>
          )}
        </View>

        {/* Card number */}
        <Text style={styles.passNum}>{pass.cardNumber}</Text>

        {/* Balance */}
        <View style={styles.passBalRow}>
          {pass.type === "monthly" || pass.type === "student" ? (
            <View>
              <Text style={styles.passBalLabel}>STATUS</Text>
              <Text style={styles.passBalValue}>Active</Text>
            </View>
          ) : (
            <View>
              <Text style={styles.passBalLabel}>BALANCE</Text>
              <Text style={styles.passBalValue}>₹{pass.balance}</Text>
            </View>
          )}
          <View>
            <Text style={styles.passBalLabel}>EXPIRES</Text>
            <Text style={styles.passBalValue}>{pass.expiry}</Text>
          </View>
        </View>

        {/* Wave decoration */}
        <View style={styles.waveDecor}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.waveLine,
                {
                  width: 60 + i * 30,
                  opacity: 0.1 + i * 0.05,
                  borderRadius: 30 + i * 15,
                  height: 60 + i * 30,
                  position: "absolute",
                  right: -20 + i * 10,
                  bottom: -20 + i * 10,
                },
              ]}
            />
          ))}
        </View>
      </LinearGradient>

      {/* Pass actions */}
      <View style={[styles.passActions, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={styles.passActionBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <Feather name="maximize" size={16} color="#2E7D32" />
          <Text style={[styles.passActionText, { color: "#2E7D32" }]}>Show QR</Text>
        </TouchableOpacity>
        <View style={[styles.passActionDivider, { backgroundColor: "#2A2520" }]} />
        <TouchableOpacity style={styles.passActionBtn} onPress={onTopUp}>
          <Feather name="zap" size={16} color="#FFFDF9" />
          <Text style={[styles.passActionText, { color: "#FFFDF9" }]}>Top Up</Text>
        </TouchableOpacity>
        <View style={[styles.passActionDivider, { backgroundColor: "#2A2520" }]} />
        <TouchableOpacity style={styles.passActionBtn}>
          <Feather name="activity" size={16} color="#D06224" />
          <Text style={[styles.passActionText, { color: "#D06224" }]}>History</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function TopUpSheet({
  pass,
  onClose,
  onConfirm,
}: {
  pass: TransportPass;
  onClose: () => void;
  onConfirm: (amount: number) => void;
}) {
  const colors = useColors();
  const [amount, setAmount] = useState("");
  const QUICK = [100, 200, 500, 1000];

  return (
    <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.sheetHandle} />
      <Text style={[styles.sheetTitle, { color: colors.text }]}>Top Up {pass.name}</Text>
      <Text style={[styles.sheetSub, { color: colors.mutedForeground }]}>
        Current Balance: ₹{pass.balance}
      </Text>

      <View style={styles.quickAmounts}>
        {QUICK.map((a) => (
          <TouchableOpacity
            key={a}
            style={[
              styles.quickAmountBtn,
              { backgroundColor: amount === String(a) ? colors.primary : colors.muted },
            ]}
            onPress={() => setAmount(String(a))}
          >
            <Text style={[styles.quickAmountText, { color: amount === String(a) ? "#fff" : colors.mutedForeground }]}>
              ₹{a}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.amountInput, { backgroundColor: colors.muted, borderColor: colors.border }]}>
        <Text style={[styles.rupee, { color: colors.text }]}>₹</Text>
        <TextInput
          style={[styles.amountInputText, { color: colors.text }]}
          placeholder="Custom amount"
          placeholderTextColor={colors.textTertiary}
          keyboardType="number-pad"
          value={amount}
          onChangeText={setAmount}
          selectionColor={colors.primary}
        />
      </View>

      <TouchableOpacity
        style={[styles.topUpBtn, { opacity: amount ? 1 : 0.5 }]}
        onPress={() => {
          const n = parseInt(amount);
          if (n > 0) onConfirm(n);
        }}
        disabled={!amount}
      >
        <LinearGradient colors={[colors.sunset, colors.sunsetDark]} style={styles.topUpBtnGrad}>
          <Text style={styles.topUpBtnText}>Add ₹{amount || "0"}</Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity onPress={onClose} style={styles.cancelLink}>
        <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function TransportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { transportPasses, topUpTransport } = useWallet();
  const [topUpPass, setTopUpPass] = useState<TransportPass | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const totalBalance = transportPasses.reduce((s, tp) => s + tp.balance, 0);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 16, paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 40 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Transport Wallet</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Summary card */}
      <LinearGradient colors={[colors.successLight, "#1A2A18"]} style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <View style={[styles.summaryIcon, { backgroundColor: "rgba(34,197,94,0.2)" }]}>
            <Feather name="map" size={24} color="#2E7D32" />
          </View>
          <View>
            <Text style={styles.summaryLabel}>Total Transit Balance</Text>
            <Text style={styles.summaryAmount}>₹{totalBalance}</Text>
          </View>
        </View>
        <View style={styles.summaryStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{transportPasses.length}</Text>
            <Text style={styles.statLabel}>Active Passes</Text>
          </View>
          <View style={[styles.statDivider]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: "#2E7D32" }]}>
              {transportPasses.filter((tp) => tp.balance > 100).length}
            </Text>
            <Text style={styles.statLabel}>Sufficient</Text>
          </View>
          <View style={[styles.statDivider]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: "#EF4444" }]}>
              {transportPasses.filter((tp) => tp.balance <= 100 && tp.balance >= 0).length}
            </Text>
            <Text style={styles.statLabel}>Low Balance</Text>
          </View>
        </View>
      </LinearGradient>

      {/* NFC teaser */}
      <TouchableOpacity
        style={[styles.nfcTeaser, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => router.push("/nfc-pay")}
      >
        <Feather name="wifi" size={18} color="#FFFDF9" />
        <Text style={[styles.nfcTeaserText, { color: colors.text }]}>
          Tap phone to Metro gate — NFC enabled
        </Text>
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      </TouchableOpacity>

      {/* Passes */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Passes</Text>
      {transportPasses.map((pass) => (
        <PassCard
          key={pass.id}
          pass={pass}
          onTopUp={() => setTopUpPass(pass)}
        />
      ))}

      {/* Top up sheet */}
      {topUpPass && (
        <TopUpSheet
          pass={topUpPass}
          onClose={() => setTopUpPass(null)}
          onConfirm={(amount) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            topUpTransport(topUpPass.id, amount);
            setTopUpPass(null);
            Alert.alert("Success", `₹${amount} added to ${topUpPass.name}`);
          }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 0 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: "800" },
  summaryCard: { borderRadius: 20, padding: 20, marginBottom: 16 },
  summaryTop: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 20 },
  summaryIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  summaryLabel: { color: "rgba(255,255,255,0.6)", fontSize: 12, marginBottom: 2 },
  summaryAmount: { color: "#FFFDF9", fontSize: 32, fontWeight: "900" },
  summaryStats: { flexDirection: "row", alignItems: "center" },
  statItem: { flex: 1, alignItems: "center" },
  statValue: { color: "#FFFDF9", fontSize: 22, fontWeight: "800" },
  statLabel: { color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.15)" },
  nfcTeaser: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 24,
  },
  nfcTeaserText: { flex: 1, fontSize: 13, fontWeight: "500" },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 14 },
  passWrap: { marginBottom: 16, borderRadius: 20, overflow: "hidden" },
  passCard: { padding: 20, position: "relative", overflow: "hidden" },
  passTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  passTypeIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  passType: { color: "#FFFDF9", fontSize: 16, fontWeight: "700" },
  passCity: { color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 1 },
  lowBadge: {
    marginLeft: "auto",
    backgroundColor: "#EF4444",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  lowBadgeText: { color: "#FFFDF9", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  passNum: { color: "rgba(255,255,255,0.5)", fontSize: 12, letterSpacing: 2, marginBottom: 16 },
  passBalRow: { flexDirection: "row", gap: 40 },
  passBalLabel: { color: "rgba(255,255,255,0.5)", fontSize: 9, fontWeight: "700", letterSpacing: 1.5, marginBottom: 2 },
  passBalValue: { color: "#FFFDF9", fontSize: 18, fontWeight: "800" },
  waveDecor: { position: "absolute", right: 0, bottom: 0, width: 120, height: 120 },
  waveLine: { borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  passActions: {
    flexDirection: "row",
    backgroundColor: "#1A1510",
    borderTopWidth: 0,
  },
  passActionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12 },
  passActionText: { fontSize: 13, fontWeight: "600" },
  passActionDivider: { width: 1, height: "100%" },
  sheet: { borderRadius: 24, padding: 24, borderWidth: 1, marginTop: 20, gap: 12 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#2A2520", alignSelf: "center", marginBottom: 4 },
  sheetTitle: { fontSize: 18, fontWeight: "800", textAlign: "center" },
  sheetSub: { textAlign: "center", fontSize: 14 },
  quickAmounts: { flexDirection: "row", gap: 8 },
  quickAmountBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  quickAmountText: { fontSize: 14, fontWeight: "700" },
  amountInput: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1 },
  rupee: { fontSize: 22, fontWeight: "800" },
  amountInputText: { flex: 1, fontSize: 22, fontWeight: "700" },
  topUpBtn: { borderRadius: 14, overflow: "hidden" },
  topUpBtnGrad: { paddingVertical: 14, alignItems: "center" },
  topUpBtnText: { color: "#FFFDF9", fontSize: 16, fontWeight: "700" },
  cancelLink: { alignItems: "center", paddingVertical: 8 },
  cancelText: { fontSize: 15 },
});
