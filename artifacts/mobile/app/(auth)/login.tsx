import { Feather } from "@expo/vector-icons";
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

import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const insets = useSafeAreaInsets();
  const { setPendingPhone } = useAuth();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => {
        // Wait a tiny bit for layout adjustment, then scroll to end
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 80);
      }
    );
    return () => {
      showSubscription.remove();
    };
  }, []);

  const handleSendOTP = () => {
    if (phone.length !== 10 || !/^\d+$/.test(phone)) {
      setError("Enter a valid 10-digit phone number");
      return;
    }
    setError("");
    setPendingPhone(phone);
    router.push("/(auth)/otp");
  };

  const handleFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

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

                <View style={styles.logo}>
                  <LinearGradient colors={["#FF6B00", "#FF9240"]} style={styles.logoGradient}>
                    <Feather name="layers" size={24} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.logoText}>Vault</Text>
                </View>

                <Text style={styles.heading}>Enter your{"\n"}phone number</Text>
                <Text style={styles.subheading}>We'll send you a verification code</Text>

                <View style={[styles.inputWrap, error ? styles.inputError : null]}>
                  <View style={styles.countryCode}>
                    <Text style={styles.flag}>🇮🇳</Text>
                    <Text style={styles.code}>+91</Text>
                  </View>
                  <View style={styles.divider} />
                  <TextInput
                    ref={inputRef}
                    style={styles.input}
                    placeholder="Mobile Number"
                    placeholderTextColor="#6B7280"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phone}
                    onChangeText={(t) => {
                      setPhone(t);
                      if (error) setError("");
                    }}
                    onFocus={handleFocus}
                    selectionColor="#FF6B00"
                  />
                </View>

                {!!error && <Text style={styles.errorText}>{error}</Text>}

                <Text style={styles.terms}>
                  By continuing, you agree to Vault's{" "}
                  <Text style={styles.link}>Terms of Service</Text> and{" "}
                  <Text style={styles.link}>Privacy Policy</Text>
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.btnWrap, phone.length !== 10 && styles.btnDisabled]}
                onPress={handleSendOTP}
                activeOpacity={0.85}
                disabled={phone.length !== 10}
              >
                <LinearGradient
                  colors={phone.length === 10 ? ["#FF6B00", "#FF9240"] : ["#262B36", "#262B36"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.btn}
                >
                  <Text style={styles.btnText}>Send OTP</Text>
                  <Feather name="arrow-right" size={18} color="#fff" />
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
  content: {
    flex: 1,
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
    color: "#fff",
    letterSpacing: -0.5,
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
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#171A21",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#262B36",
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 12,
  },
  inputError: {
    borderColor: "#EF4444",
  },
  countryCode: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingRight: 12,
  },
  flag: { fontSize: 20 },
  code: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: "#262B36",
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    paddingVertical: 14,
    letterSpacing: 1,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 13,
    marginBottom: 12,
  },
  terms: {
    color: "#6B7280",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  link: {
    color: "#FF6B00",
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
