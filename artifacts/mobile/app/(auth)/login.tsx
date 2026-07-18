import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState, useEffect } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function Login() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { sendOtp, setPendingPhone } = useAuth();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const borderProgress = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

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

  const handleSendOTP = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (phone.length !== 10 || !/^\d+$/.test(phone)) {
      setError("Enter a valid 10-digit phone number");
      return;
    }
    setError("");
    try {
      await sendOtp(phone);
      setPendingPhone(phone);
      router.push("/(auth)/otp");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      console.warn(`[login] sendOtp failed: ${msg}`);
      setError(`Failed to send OTP (${msg})`);
    }
  };

  const handleFocus = () => {
    borderProgress.value = withTiming(1, { duration: 250 });
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleBlur = () => {
    borderProgress.value = withTiming(0, { duration: 250 });
  };

  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor: withTiming(
      error ? colors.error : borderProgress.value ? colors.primary : colors.border,
      { duration: 200 }
    ),
  }));

  const animatedBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const isValid = phone.length === 10 && /^\d+$/.test(phone);

  const handlePressIn = () => {
    buttonScale.value = withTiming(0.98, { duration: 80 });
  };
  const handlePressOut = () => {
    buttonScale.value = withTiming(1, { duration: 80 });
  };

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
                  <TouchableOpacity
                    style={styles.back}
                    onPress={() => {
                      if (Platform.OS !== "web") {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      router.back();
                    }}
                  >
                    <Feather name="arrow-left" size={22} color={colors.text} />
                  </TouchableOpacity>
                </Animated.View>

                <Animated.View entering={FadeInDown.duration(500).delay(120)}>
                  <View style={styles.logo}>
                    <LinearGradient
                      colors={[colors.primary, colors.primaryLight]}
                      style={styles.logoGradient}
                    >
                      <Feather name="layers" size={24} color={colors.background} />
                    </LinearGradient>
                    <Text style={[styles.logoText, { color: colors.text }]}>Vault</Text>
                  </View>
                </Animated.View>

                <Animated.View entering={FadeInDown.duration(500).delay(200)}>
                  <Text style={[styles.heading, { color: colors.text }]}>
                    Enter your{"\n"}phone number
                  </Text>
                  <Text style={[styles.subheading, { color: colors.mutedForeground }]}>
                    We'll send you a verification code
                  </Text>
                </Animated.View>

                <Animated.View entering={FadeInDown.duration(500).delay(280)}>
                  <Animated.View
                    style={[
                      styles.inputWrap,
                      animatedBorderStyle,
                      { backgroundColor: colors.surface },
                    ]}
                  >
                    <View style={styles.countryCode}>
                      <Text style={styles.flag}>🇮🇳</Text>
                      <Text style={[styles.code, { color: colors.text }]}>+91</Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <TextInput
                      ref={inputRef}
                      style={[styles.input, { color: colors.text }]}
                      placeholder="Mobile Number"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="phone-pad"
                      maxLength={10}
                      value={phone}
                      onChangeText={(t) => {
                        setPhone(t);
                        if (error) setError("");
                      }}
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                      selectionColor={colors.primary}
                    />
                  </Animated.View>

                  {!!error && (
                    <Animated.View entering={FadeIn.duration(200)}>
                      <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                    </Animated.View>
                  )}

                  <Text style={[styles.terms, { color: colors.textTertiary }]}>
                    By continuing, you agree to Vault's{" "}
                    <Text style={[styles.link, { color: colors.primary }]}>Terms of Service</Text>{" "}
                    and <Text style={[styles.link, { color: colors.primary }]}>Privacy Policy</Text>
                  </Text>
                </Animated.View>
              </View>

              <Animated.View entering={FadeInDown.duration(500).delay(360)}>
                <Animated.View style={animatedBtnStyle}>
                  <TouchableOpacity
                    style={[styles.btnWrap, !isValid && styles.btnDisabled]}
                    onPress={handleSendOTP}
                    activeOpacity={0.85}
                    disabled={!isValid}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
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
                        Send OTP
                      </Text>
                      <Feather
                        name="arrow-right"
                        size={18}
                        color={isValid ? colors.text : colors.textTertiary}
                      />
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
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
  logo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 32,
  },
  logoGradient: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  heading: {
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 42,
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subheading: {
    fontSize: 15,
    marginBottom: 40,
    lineHeight: 22,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 12,
  },
  countryCode: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingRight: 12,
  },
  flag: { fontSize: 20 },
  code: {
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    width: 1,
    height: 24,
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    paddingVertical: 14,
    letterSpacing: 1,
  },
  errorText: {
    fontSize: 13,
    marginBottom: 12,
    fontWeight: "500",
  },
  terms: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  link: {
    fontWeight: "600",
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
    fontSize: 17,
    fontWeight: "700",
  },
});
