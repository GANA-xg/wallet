import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";

export default function LockScreen() {
  const insets = useSafeAreaInsets();
  const { verifyBiometric, biometricAvailable, user, skipBiometric } = useAuth();
  const [status, setStatus] = useState<"idle" | "verifying" | "failed">("idle");
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  // Pulse animation for the biometric ring
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Auto-trigger biometric on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      handleBiometric();
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleBiometric = async () => {
    setStatus("verifying");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const ok = await verifyBiometric();
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } else {
      setStatus("failed");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      shake();
    }
  };

  const handleSkip = () => {
    skipBiometric();
    router.replace("/(tabs)");
  };

  const firstName = user?.name.split(" ")[0] ?? "User";

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad }]}>
      {/* Background gradient */}
      <LinearGradient
        colors={["#0F1115", "#161a25"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={styles.header}>
        <LinearGradient colors={["#F4F4F5", "#D4D4D8"]} style={styles.logoGrad}>
          <Feather name="layers" size={24} color="#fff" />
        </LinearGradient>
        <Text style={styles.logoText}>Vault</Text>
      </View>

      {/* Main content */}
      <View style={styles.content}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.name}>{firstName}</Text>

        {/* Biometric ring */}
        <View style={styles.biometricArea}>
          <Animated.View
            style={[
              styles.outerRing,
              {
                transform: [{ scale: pulseAnim }],
                opacity: status === "failed" ? 0.4 : 0.3,
                borderColor: status === "failed" ? "#EF4444" : "#F4F4F5",
              },
            ]}
          />
          <Animated.View
            style={[styles.biometricBtn, { transform: [{ translateX: shakeAnim }] }]}
          >
            <TouchableOpacity
              style={[
                styles.biometricInner,
                {
                  backgroundColor:
                    status === "verifying"
                      ? "#F4F4F5"
                      : status === "failed"
                      ? "#EF4444"
                      : "#171A21",
                },
              ]}
              onPress={handleBiometric}
              activeOpacity={0.8}
              disabled={status === "verifying"}
            >
              <Feather
                name={status === "failed" ? "x" : biometricAvailable ? "cpu" : "lock"}
                size={36}
                color={status === "verifying" || status === "failed" ? "#fff" : "#F4F4F5"}
              />
            </TouchableOpacity>
          </Animated.View>
        </View>

        <Text style={styles.instruction}>
          {status === "verifying"
            ? "Verifying..."
            : status === "failed"
            ? "Verification failed"
            : biometricAvailable
            ? "Use Face ID or Fingerprint"
            : "Tap to unlock"}
        </Text>

        {status === "failed" && (
          <TouchableOpacity style={styles.retryBtn} onPress={handleBiometric}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
          <Feather name="chevron-right" size={14} color="#6B7280" />
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1115" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 28,
    paddingTop: 8,
  },
  logoGrad: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: { color: "#fff", fontSize: 24, fontWeight: "800" },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  greeting: { color: "#B0B7C3", fontSize: 18, marginBottom: 4 },
  name: { color: "#fff", fontSize: 34, fontWeight: "800", marginBottom: 60, letterSpacing: -0.5 },
  biometricArea: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  outerRing: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
  },
  biometricBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: "hidden",
  },
  biometricInner: {
    flex: 1,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#262B36",
  },
  instruction: {
    color: "#B0B7C3",
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
  },
  retryBtn: { marginTop: 20, paddingVertical: 12, paddingHorizontal: 28 },
  retryText: { color: "#F4F4F5", fontSize: 16, fontWeight: "700" },
  footer: { paddingHorizontal: 28, alignItems: "center", paddingBottom: 16 },
  skipBtn: { flexDirection: "row", alignItems: "center", gap: 4, padding: 8 },
  skipText: { color: "#6B7280", fontSize: 14 },
});
