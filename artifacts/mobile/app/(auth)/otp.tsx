import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Platform,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const OTP_LENGTH = 6;

function OtpBox({ char, isActive, isFilled, index, colors }: { char: string; isActive: boolean; isFilled: boolean; index: number; colors: ReturnType<typeof useColors> }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isFilled) {
      scale.value = withSequence(
        withTiming(1.08, { duration: 80, easing: Easing.out(Easing.exp) }),
        withTiming(1, { duration: 120, easing: Easing.out(Easing.exp) }),
      );
    }
  }, [isFilled]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: withTiming(
      isActive ? colors.primary : isFilled ? colors.primary : colors.border,
      { duration: 200 },
    ),
    backgroundColor: withTiming(
      isActive ? colors.surface : isFilled ? colors.surface : colors.surface,
      { duration: 200 },
    ),
  }));

  return (
    <Animated.View
      key={index}
      style={[styles.otpBox, animatedStyle]}
      entering={FadeInDown.duration(300).delay(index * 60)}
    >
      <Text style={[styles.otpChar, { color: colors.text }]}>{char}</Text>
    </Animated.View>
  );
}

export default function OTP() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { pendingPhone, verifyOtp, sendOtp } = useAuth();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(30);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    const interval = setInterval(() => {
      setResendTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => {
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 80);
      }
    );
    return () => {
      showSubscription.remove();
    };
  }, []);

  const handleVerify = async () => {
    if (otp.length !== OTP_LENGTH) {
      setError("Enter the 6-digit OTP");
      return;
    }
    setLoading(true);
    setError("");

    try {
      await verifyOtp(pendingPhone, otp);
      router.replace("/(auth)/register");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendTimer(30);
    try {
      await sendOtp(pendingPhone);
    } catch {
      setError("Failed to resend OTP");
    }
  };

  const displayPhone = pendingPhone
    ? `+91 ${pendingPhone.slice(0, 5)} ${pendingPhone.slice(5)}`
    : "+91 98765 43210";

  const isValid = otp.length === OTP_LENGTH;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.innerContent, { paddingTop: topPad, paddingBottom: bottomPad }]}>
              <View>
                <Animated.View entering={FadeInDown.duration(400)}>
                  <TouchableOpacity style={styles.back} onPress={() => router.back()}>
                    <Feather name="arrow-left" size={22} color={colors.text} />
                  </TouchableOpacity>
                </Animated.View>

                <View style={styles.content}>
                  <Animated.View entering={FadeInDown.duration(500).delay(120)}>
                    <View style={styles.iconWrap}>
                      <View style={[styles.iconBg, { borderColor: colors.border }]}>
                        <Feather name="message-circle" size={32} color={colors.primary} />
                      </View>
                    </View>
                  </Animated.View>

                  <Animated.View entering={FadeInDown.duration(500).delay(200)}>
                    <Text style={[styles.heading, { color: colors.text }]}>
                      Verify your{"\n"}number
                    </Text>
                    <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
                      OTP sent to{" "}
                      <Text style={[styles.phone, { color: colors.primary }]}>{displayPhone}</Text>
                    </Text>
                  </Animated.View>

                  <Animated.View entering={FadeInDown.duration(500).delay(280)}>
                    <TouchableOpacity
                      style={styles.otpContainer}
                      onPress={() => inputRef.current?.focus()}
                    >
                      {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                        <OtpBox
                          key={i}
                          index={i}
                          char={otp[i] || ""}
                          isActive={otp.length === i}
                          isFilled={otp.length > i}
                          colors={colors}
                        />
                      ))}
                    </TouchableOpacity>

                    <TextInput
                      ref={inputRef}
                      style={styles.hiddenInput}
                      keyboardType="number-pad"
                      maxLength={OTP_LENGTH}
                      value={otp}
                      onChangeText={(t) => {
                        setOtp(t);
                        if (error) setError("");
                      }}
                      autoFocus
                      caretHidden
                    />

                    {!!error && (
                      <Animated.View entering={FadeIn.duration(200)}>
                        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                      </Animated.View>
                    )}

                    <View style={styles.resendRow}>
                      {resendTimer > 0 ? (
                        <Text style={[styles.resendInfo, { color: colors.mutedForeground }]}>
                          Resend OTP in{" "}
                          <Text style={[styles.timer, { color: colors.primary }]}>
                            {resendTimer}s
                          </Text>
                        </Text>
                      ) : (
                        <TouchableOpacity onPress={handleResend} activeOpacity={0.7}>
                          <Text style={[styles.resendBtn, { color: colors.primary }]}>
                            Resend OTP
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </Animated.View>
                </View>
              </View>

              <Animated.View entering={FadeInDown.duration(500).delay(360)}>
                <TouchableOpacity
                  style={[styles.btnWrap, (!isValid || loading) && styles.btnDisabled]}
                  onPress={handleVerify}
                  activeOpacity={0.85}
                  disabled={!isValid || loading}
                >
                  <LinearGradient
                    colors={
                      isValid
                        ? [colors.primary, colors.primaryLight]
                        : [colors.surface, colors.surface]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.btn}
                  >
                    <Text style={[styles.btnText, !isValid && { color: colors.textTertiary }]}>
                      {loading ? "Verifying..." : "Verify & Continue"}
                    </Text>
                    {!loading && (
                      <Feather
                        name="arrow-right"
                        size={18}
                        color={isValid ? colors.text : colors.textTertiary}
                      />
                    )}
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
  container: {
    flex: 1,
    backgroundColor: "#0F1115",
    paddingHorizontal: 24,
  },
  scrollContent: {
    flexGrow: 1,
  },
  innerContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  back: {
    marginBottom: 24,
    width: 48,
    height: 48,
    justifyContent: "center",
  },
  content: { flex: 1 },
  iconWrap: { marginBottom: 28 },
  iconBg: {
    width: 72,
    height: 72,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#262B36",
  },
  heading: {
    fontSize: 34,
    fontWeight: "800",
    color: "#fff",
    lineHeight: 42,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: 15,
    color: "#B0B7C3",
    marginBottom: 40,
    lineHeight: 22,
  },
  phone: {
    color: "#F4F4F5",
    fontWeight: "600",
  },
  otpContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  otpBox: {
    flex: 1,
    height: 58,
    borderRadius: 14,
    backgroundColor: "#171A21",
    borderWidth: 1.5,
    borderColor: "#262B36",
    justifyContent: "center",
    alignItems: "center",
  },
  otpChar: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    height: 0,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 13,
    marginBottom: 12,
    fontWeight: "500",
  },
  resendRow: {
    marginTop: 20,
  },
  resendInfo: {
    color: "#B0B7C3",
    fontSize: 14,
  },
  timer: {
    color: "#F4F4F5",
    fontWeight: "700",
  },
  resendBtn: {
    color: "#F4F4F5",
    fontSize: 14,
    fontWeight: "700",
  },
  btnWrap: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btn: {
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  btnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  btnTextDisabled: {
    color: "#6B7280",
  },
});
