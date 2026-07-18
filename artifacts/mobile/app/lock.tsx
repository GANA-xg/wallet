import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
} from "react-native-reanimated";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

type LockStatus = "idle" | "verifying" | "failed" | "expired";

export default function LockScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { verifyBiometric, biometricAvailable, user, logout } = useAuth();
  const [status, setStatus] = useState<LockStatus>("idle");

  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.3);
  const shakeOffset = useSharedValue(0);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.12, { duration: 900, easing: Easing.inOut(Easing.exp) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.exp) }),
      ),
      -1,
      true,
    );
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.15, { duration: 900, easing: Easing.inOut(Easing.exp) }),
        withTiming(0.3, { duration: 900, easing: Easing.inOut(Easing.exp) }),
      ),
      -1,
      true,
    );
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleBiometric();
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const shake = () => {
    shakeOffset.value = withSequence(
      withTiming(12, { duration: 50 }),
      withTiming(-12, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-8, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
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

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/onboarding");
  };

  const firstName = user?.name?.split(" ")[0] ?? "User";

  const outerRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: status === "failed" ? 0.4 : pulseOpacity.value,
    borderColor: withTiming(status === "failed" ? colors.error : colors.primary, { duration: 250 }),
  }));

  const biometricBtnStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeOffset.value }],
  }));

  const innerBg = status === "verifying"
    ? colors.primary
    : status === "failed"
    ? colors.error
    : colors.surface;

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
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
    logoText: { color: colors.text, fontSize: 24, fontWeight: "800" },
    content: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 28,
    },
    greeting: { color: colors.mutedForeground, fontSize: 18, marginBottom: 4 },
    name: { color: colors.text, fontSize: 34, fontWeight: "800", marginBottom: 60, letterSpacing: -0.5 },
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
      borderColor: colors.border,
    },
    instruction: {
      color: colors.mutedForeground,
      fontSize: 16,
      fontWeight: "500",
      textAlign: "center",
    },
    retryBtn: { marginTop: 20, paddingVertical: 12, paddingHorizontal: 28 },
    retryText: { color: colors.primary, fontSize: 16, fontWeight: "700" },
    footer: { paddingHorizontal: 28, alignItems: "center", paddingBottom: 16 },
    logoutBtn: { flexDirection: "row", alignItems: "center", gap: 6, padding: 8 },
    logoutText: { color: colors.textTertiary, fontSize: 14 },
  });

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad }]}>
      <LinearGradient
        colors={[colors.background, colors.surface]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <LinearGradient colors={[colors.primary, "#AE431E"]} style={styles.logoGrad}>
          <Feather name="layers" size={24} color={colors.text} />
        </LinearGradient>
        <Text style={styles.logoText}>Vault</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.name}>{firstName}</Text>

        <View style={styles.biometricArea}>
          <Animated.View
            style={[
              styles.outerRing,
              outerRingStyle,
            ]}
          />
          <Animated.View
            style={[styles.biometricBtn, biometricBtnStyle]}
          >
            <TouchableOpacity
              style={[
                styles.biometricInner,
                { backgroundColor: innerBg },
              ]}
              onPress={handleBiometric}
              activeOpacity={0.8}
              disabled={status === "verifying"}
            >
              <Feather
                name={status === "failed" ? "x" : biometricAvailable ? "cpu" : "lock"}
                size={36}
                color={status === "verifying" || status === "failed" ? colors.text : colors.primary}
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

      <View style={styles.footer}>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Feather name="log-out" size={14} color={colors.textTertiary} />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
