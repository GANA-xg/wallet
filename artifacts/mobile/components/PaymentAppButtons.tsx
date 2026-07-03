import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  UPI_APPS,
  createPaymentRequest,
  getStoreUrl,
  isUpiDeepLinkSupported,
  launchUpiPayment,
  openAppStore,
  type UpiAppId,
  type UpiPaymentRequest,
} from "@/services/payment";
import { useColors } from "@/hooks/useColors";

interface Props {
  request: UpiPaymentRequest;
  onLaunched: (appId: UpiAppId) => void;
  onLaunchFailed?: (appId: UpiAppId, reason: string) => void;
  disabled?: boolean;
}

export function PaymentAppButtons({ request, onLaunched, onLaunchFailed, disabled }: Props) {
  const colors = useColors();
  const [launching, setLaunching] = useState<UpiAppId | null>(null);

  const handleLaunch = async (appId: UpiAppId) => {
    if (disabled || launching) return;

    setLaunching(appId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await launchUpiPayment(appId, request);

    if (result.ok) {
      onLaunched(appId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLaunching(null);
      return;
    }

    setLaunching(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    if (result.reason === "unsupported_platform") {
      onLaunchFailed?.(appId, result.reason);
      Alert.alert(
        "UPI launch unavailable",
        "UPI app deep links are not supported on iPhone while running in Expo Go. Please test this payment redirection flow on Android.",
      );
      return;
    }

    if (result.reason === "app_not_installed") {
      onLaunchFailed?.(appId, result.reason);
      const app = UPI_APPS.find((item) => item.id === appId);
      Alert.alert(
        `${app?.label ?? "App"} not installed`,
        "Install the app to complete your payment, or choose another UPI app.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Install",
            onPress: () => {
              void openAppStore(appId);
            },
          },
        ],
      );
      return;
    }

    onLaunchFailed?.(appId, result.reason);
    Alert.alert("Unable to launch", "Please try another UPI app or check your payment details.");
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>Pay with</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Payment opens in your UPI app — Vault never processes or stores your PIN.
      </Text>

      {!isUpiDeepLinkSupported() && (
        <Text style={[styles.platformHint, { color: colors.mutedForeground }]}>
          UPI app launch is available on Android. iPhone Expo Go can scan and verify payment
          details, but cannot open Android UPI deep links.
        </Text>
      )}

      {UPI_APPS.map((app) => {
        const isLoading = launching === app.id;
        return (
          <TouchableOpacity
            key={app.id}
            style={[styles.button, { opacity: disabled || (launching && !isLoading) ? 0.5 : 1 }]}
            onPress={() => handleLaunch(app.id)}
            disabled={disabled || !!launching}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[app.color, app.color + "CC"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGrad}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="external-link" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Pay with {app.label}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        );
      })}

      {Platform.OS === "web" && (
        <Text style={[styles.webHint, { color: colors.mutedForeground }]}>
          On web preview, store links are used: {UPI_APPS.map((a) => a.label).join(", ")}.
        </Text>
      )}
    </View>
  );
}

export function buildLaunchRequest(input: {
  payeeAddress: string;
  payeeName?: string;
  merchantCode?: string;
  amount: string;
  note: string;
}): UpiPaymentRequest | null {
  const amountValue = Number.parseFloat(input.amount);
  if (!Number.isFinite(amountValue) || amountValue <= 0) return null;

  return createPaymentRequest({
    payeeAddress: input.payeeAddress,
    payeeName: input.payeeName,
    merchantCode: input.merchantCode,
    amount: amountValue,
    note: input.note,
  });
}

export { getStoreUrl };

const styles = StyleSheet.create({
  container: { gap: 12 },
  title: { fontSize: 18, fontWeight: "800", marginBottom: 2 },
  subtitle: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  button: { borderRadius: 16, overflow: "hidden" },
  buttonGrad: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    paddingVertical: 18,
  },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  platformHint: { fontSize: 12, lineHeight: 17, marginBottom: 4 },
  webHint: { fontSize: 12, textAlign: "center", marginTop: 4 },
});
