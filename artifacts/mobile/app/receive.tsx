import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from "react-native";
import Svg, { Rect } from "react-native-svg";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";

function QRPattern({ fill }: { fill: string }) {
  const size = 220;
  const cellSize = 8;
  const cols = Math.floor(size / cellSize);

  const pattern: boolean[][] = [];
  for (let r = 0; r < cols; r++) {
    pattern.push([]);
    for (let c = 0; c < cols; c++) {
      const isCorner =
        (r < 4 && c < 4) ||
        (r < 4 && c >= cols - 4) ||
        (r >= cols - 4 && c < 4);
      const isBorder =
        (r === 0 || r === 1 || r === cols - 1 || r === cols - 2) ||
        (c === 0 || c === 1 || c === cols - 1 || c === cols - 2);
      if (isCorner || (isBorder && Math.random() > 0.4)) {
        pattern[r].push(true);
      } else {
        pattern[r].push(Math.random() > 0.55);
      }
    }
  }

  return (
    <Svg width={size} height={size}>
      {pattern.map((row, r) =>
        row.map((filled, c) =>
          filled ? (
            <Rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize - 1}
              height={cellSize - 1}
              fill={fill}
              rx={1}
            />
          ) : null
        )
      )}
    </Svg>
  );
}

export default function ReceiveScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { upiAccounts } = useWallet();
  const [amount, setAmount] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const primaryUPI = upiAccounts.find((u) => u.primary);
  const upiId = primaryUPI?.upiId ?? "aryan.sharma@hdfc";

  const handleShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const msg = amount
      ? `Pay ₹${amount} to ${user?.name ?? "Aryan Sharma"}\nUPI ID: ${upiId}`
      : `Pay ${user?.name ?? "Aryan Sharma"}\nUPI ID: ${upiId}`;
    Share.share({ message: msg });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <Animated.View entering={FadeInDown.duration(500).delay(0)} style={[styles.header, { paddingTop: topPad + 16 }]}>
            <TouchableOpacity onPress={() => router.back()}>
              <Feather name="arrow-left" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>Receive Money</Text>
            <TouchableOpacity onPress={handleShare}>
              <Feather name="share-2" size={20} color={colors.text} />
            </TouchableOpacity>
          </Animated.View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.content, { paddingBottom: bottomPad + 24 }]}>
              {/* QR Card */}
              <Animated.View entering={FadeInDown.duration(500).delay(100)} style={[styles.qrCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
                <Text style={[styles.cardName, { color: colors.text }]}>
                  {user?.name ?? "Aryan Sharma"}
                </Text>
                <Text style={[styles.cardUpi, { color: colors.mutedForeground }]}>{upiId}</Text>

                <View style={[styles.qrContainer, { backgroundColor: colors.surfaceElevated, borderRadius: 16 }]}> 
                  <QRPattern fill={colors.primary} />
                  <View style={[styles.qrCenter, { backgroundColor: colors.surface }]}>
                    <LinearGradient colors={[colors.primary, colors.sunset]} style={styles.qrLogo}>
                      <Feather name="layers" size={16} color={colors.text} />
                    </LinearGradient>
                  </View>
                </View>

                <View style={styles.scanHint}>
                  <Feather name="maximize" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.scanHintText, { color: colors.mutedForeground }]}>
                    Scan to pay via any UPI app
                  </Text>
                </View>
              </Animated.View>

              {/* Amount */}
              <Animated.View entering={FadeInDown.duration(500).delay(200)} style={[styles.amountCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.amountLabel, { color: colors.mutedForeground }]}>
                  Request specific amount (optional)
                </Text>
                <View style={styles.amountRow}>
                  <Text style={[styles.rupeeSign, { color: colors.text }]}>₹</Text>
                  <TextInput
                    style={[styles.amountInput, { color: colors.text }]}
                    placeholder="0"
                    placeholderTextColor={colors.textTertiary}
                    keyboardType="decimal-pad"
                    value={amount}
                    onChangeText={setAmount}
                    selectionColor={colors.primary}
                  />
                </View>
              </Animated.View>

              {/* UPI Apps */}
              <Animated.View entering={FadeInDown.duration(500).delay(300)} style={styles.appsRow}>
                {["GPay", "PhonePe", "Paytm", "BHIM"].map((app) => (
                  <View key={app} style={[styles.appChip, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.appChipText, { color: colors.mutedForeground }]}>{app}</Text>
                  </View>
                ))}
              </Animated.View>

              {/* Share Button */}
              <Animated.View entering={FadeInDown.duration(500).delay(400)}>
              <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.85}>
                <LinearGradient
                  colors={[colors.primary, colors.sunset]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.shareBtnGrad}
                >
                  <Feather name="share-2" size={18} color={colors.text} />
                  <Text style={[styles.shareBtnText, { color: colors.text }]}>Share Payment Link</Text>
                </LinearGradient>
              </TouchableOpacity>
              </Animated.View>
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: { fontSize: 18, fontWeight: "700" },
  content: {
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 16,
    width: "100%",
  },
  qrCard: {
    width: "100%",
    alignItems: "center",
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
  },
  cardName: { fontSize: 20, fontWeight: "800" },
  cardUpi: { fontSize: 14 },
  qrContainer: {
    padding: 16,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  qrCenter: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 10,
    overflow: "hidden",
    padding: 2,
  },
  qrLogo: {
    flex: 1,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  scanHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  scanHintText: { fontSize: 13 },
  amountCard: {
    width: "100%",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  amountLabel: { fontSize: 12, marginBottom: 8 },
  amountRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  rupeeSign: { fontSize: 24, fontWeight: "800" },
  amountInput: { flex: 1, fontSize: 28, fontWeight: "800" },
  appsRow: { flexDirection: "row", gap: 8 },
  appChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  appChipText: { fontSize: 13, fontWeight: "600" },
  shareBtn: { width: "100%", borderRadius: 16, overflow: "hidden" },
  shareBtnGrad: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },
  shareBtnText: { fontSize: 17, fontWeight: "700" },
});
