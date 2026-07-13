import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";

type PromptStatus = "idle" | "verifying" | "failed" | "expired";

interface BiometricPromptProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  onSuccess: () => void;
  onCancel?: () => void;
  onExpired?: () => void;
}

export default function BiometricPrompt({
  visible,
  title = "Authorize Action",
  subtitle = "Confirm with Face ID or Fingerprint",
  onSuccess,
  onCancel,
  onExpired,
}: BiometricPromptProps) {
  const insets = useSafeAreaInsets();
  const { verifyBiometric, biometricAvailable, logout } = useAuth();
  const [status, setStatus] = useState<PromptStatus>("idle");
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setStatus("idle");
    }
  }, [visible]);

  useEffect(() => {
    if (visible && status === "idle") {
      const timer = setTimeout(() => {
        handlePrompt();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [visible, status]);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handlePrompt = useCallback(async () => {
    setStatus("verifying");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const ok = await verifyBiometric();
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess();
    } else {
      setStatus("failed");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      shake();
    }
  }, [verifyBiometric, onSuccess]);

  const handleCancel = () => {
    onCancel?.();
  };

  const handleLogout = () => {
    logout();
    router.replace("/(auth)/login");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <LinearGradient
          colors={["rgba(15,17,21,0.98)", "rgba(22,26,37,0.98)"]}
          style={StyleSheet.absoluteFill}
        />

        <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.header}>
            <LinearGradient colors={["#F4F4F5", "#D4D4D8"]} style={styles.logoGrad}>
              <Feather name="layers" size={20} color="#fff" />
            </LinearGradient>
            <Text style={styles.logoText}>Vault</Text>
          </View>

          <View style={styles.content}>
            <View style={styles.iconSection}>
              <Feather
                name={status === "failed" ? "x-circle" : "shield"}
                size={48}
                color={status === "failed" ? "#EF4444" : "#F4F4F5"}
              />
            </View>

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>

            <Animated.View style={[styles.biometricBtn, { transform: [{ translateX: shakeAnim }] }]}>
              <TouchableOpacity
                style={[
                  styles.biometricInner,
                  {
                    backgroundColor:
                      status === "verifying" ? "#F4F4F5" : status === "failed" ? "#EF4444" : "#171A21",
                  },
                ]}
                onPress={handlePrompt}
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

            <Text style={styles.instruction}>
              {status === "verifying"
                ? "Verifying..."
                : status === "failed"
                ? "Verification failed"
                : biometricAvailable
                ? "Use Face ID or Fingerprint"
                : "Tap to authorize"}
            </Text>

            {status === "failed" && (
              <TouchableOpacity style={styles.retryBtn} onPress={handlePrompt}>
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
              <Text style={styles.logoutText}>Log out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 28,
    paddingTop: 8,
  },
  logoGrad: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: { color: "#fff", fontSize: 20, fontWeight: "800" },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  iconSection: {
    marginBottom: 24,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    color: "#B0B7C3",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 48,
    lineHeight: 22,
  },
  biometricBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: "hidden",
    marginBottom: 24,
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
  footer: {
    paddingHorizontal: 28,
    alignItems: "center",
    gap: 12,
    paddingBottom: 16,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelText: {
    color: "#B0B7C3",
    fontSize: 16,
    fontWeight: "600",
  },
  logoutBtn: {
    padding: 8,
  },
  logoutText: { color: "#6B7280", fontSize: 14 },
});
