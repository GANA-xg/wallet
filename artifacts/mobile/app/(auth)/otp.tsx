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

import { useAuth } from "@/context/AuthContext";

const OTP_LENGTH = 6;

export default function OTP() {
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
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
                <TouchableOpacity style={styles.back} onPress={() => router.back()}>
                  <Feather name="arrow-left" size={22} color="#fff" />
                </TouchableOpacity>

                <View style={styles.content}>
                  <View style={styles.iconWrap}>
                    <LinearGradient colors={["#171A21", "#1E2128"]} style={styles.iconBg}>
                      <Feather name="message-circle" size={32} color="#F4F4F5" />
                    </LinearGradient>
                  </View>

                  <Text style={styles.heading}>Verify your{"\n"}number</Text>
                  <Text style={styles.subheading}>
                    OTP sent to <Text style={styles.phone}>{displayPhone}</Text>
                  </Text>

                  <TouchableOpacity style={styles.otpContainer} onPress={() => inputRef.current?.focus()}>
                    {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.otpBox,
                          otp.length === i && styles.otpBoxActive,
                          otp.length > i && styles.otpBoxFilled,
                        ]}
                      >
                        <Text style={styles.otpChar}>{otp[i] || ""}</Text>
                      </View>
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

                  {!!error && <Text style={styles.errorText}>{error}</Text>}

                  <View style={styles.resendRow}>
                    {resendTimer > 0 ? (
                      <Text style={styles.resendInfo}>
                        Resend OTP in <Text style={styles.timer}>{resendTimer}s</Text>
                      </Text>
                    ) : (
                      <TouchableOpacity onPress={handleResend}>
                        <Text style={styles.resendBtn}>Resend OTP</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.btnWrap, (otp.length !== OTP_LENGTH || loading) && styles.btnDisabled]}
                onPress={handleVerify}
                activeOpacity={0.85}
                disabled={otp.length !== OTP_LENGTH || loading}
              >
                <LinearGradient
                  colors={otp.length === OTP_LENGTH ? ["#F4F4F5", "#D4D4D8"] : ["#262B36", "#262B36"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.btn}
                >
                  <Text style={styles.btnText}>{loading ? "Verifying..." : "Verify & Continue"}</Text>
                  {!loading && <Feather name="arrow-right" size={18} color="#fff" />}
                </LinearGradient>
              </TouchableOpacity>
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
    width: 40,
    height: 40,
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
    height: 56,
    borderRadius: 14,
    backgroundColor: "#171A21",
    borderWidth: 1.5,
    borderColor: "#262B36",
    justifyContent: "center",
    alignItems: "center",
  },
  otpBoxActive: {
    borderColor: "#F4F4F5",
    backgroundColor: "#1a1208",
  },
  otpBoxFilled: {
    borderColor: "#F4F4F5",
  },
  otpChar: {
    color: "#fff",
    fontSize: 22,
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
  btnDisabled: { opacity: 0.6 },
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
});
