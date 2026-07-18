import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInRight, FadeOutLeft, FadeInDown } from "react-native-reanimated";

import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";
import type { UPIAccount, VaultDocument, VaultUser } from "@/types";

type Step = "info" | "kyc" | "bank";

export default function Register() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { pendingPhone } = useAuth();
  const { addDocument, addUPIAccount } = useWallet();
  const scrollViewRef = useRef<ScrollView>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  // Step state
  const [currentStep, setCurrentStep] = useState<Step>("info");

  // Step 1: Basic Info
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState(pendingPhone || "");
  const [dob, setDob] = useState(""); // Format: DD/MM/YYYY
  const [email, setEmail] = useState("");
  const [infoError, setInfoError] = useState("");

  // Step 2: KYC state
  const [kycType, setKycType] = useState<"aadhaar" | "pan">("aadhaar");
  const [kycStatus, setKycStatus] = useState<"idle" | "scanning" | "verified" | "failed">("idle");
  const [kycLog, setKycLog] = useState("");
  const [extractedDob, setExtractedDob] = useState("");
  const [kycError, setKycError] = useState("");
  const [kycDocNum, setKycDocNum] = useState("");

  // Step 3: Bank state
  const [accountNo, setAccountNo] = useState("");
  const [confirmAccountNo, setConfirmAccountNo] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankStatus, setBankStatus] = useState<"idle" | "verifying" | "verified">("idle");
  const [bankError, setBankError] = useState("");

  // Scroll to bottom on keyboard show
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

  // Format DOB input automatically with slashes (DD/MM/YYYY)
  const handleDobChange = (text: string) => {
    let cleaned = text.replace(/\D/g, "");
    let formatted = cleaned;
    if (cleaned.length > 2) {
      formatted = cleaned.slice(0, 2) + "/" + cleaned.slice(2);
    }
    if (cleaned.length > 4) {
      formatted = formatted.slice(0, 5) + "/" + cleaned.slice(4, 8);
    }
    setDob(formatted);
    if (infoError) setInfoError("");
  };

  // Helper: Calculate age from DD/MM/YYYY
  const calculateAge = (dobStr: string): number => {
    const parts = dobStr.split("/");
    if (parts.length !== 3) return 0;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);

    const today = new Date();
    const birthDate = new Date(year, month, day);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Validate Basic Info Form
  const handleInfoNext = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (!fullName.trim()) {
      setInfoError("Enter your full name");
      return;
    }
    if (phone.length !== 10 || !/^\d+$/.test(phone)) {
      setInfoError("Enter a valid 10-digit mobile number");
      return;
    }
    if (dob.length !== 10) {
      setInfoError("Enter date of birth in DD/MM/YYYY format");
      return;
    }
    
    // Basic age validation on input
    const enteredAge = calculateAge(dob);
    if (enteredAge < 18) {
      setInfoError("You must be 18 years or older to create an account.");
      return;
    }

    setInfoError("");
    setCurrentStep("kyc");
  };

  // Run simulated OCR + Selfie Check
  const runKycVerification = async (dobMode: "valid" | "underage") => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setKycStatus("scanning");
    setKycError("");
    
    const logs = [
      "Initializing OCR Engine...",
      "Detecting document type...",
      "Extracting text details...",
      "Extracting photo from document...",
      "Opening selfie verification window...",
      "Verifying live human presence...",
      "Comparing facial contours with document image...",
      "Finalizing matching verification..."
    ];

    for (let i = 0; i < logs.length; i++) {
      setKycLog(logs[i]);
      await new Promise((r) => setTimeout(r, 450));
    }

    const docDob = dobMode === "valid" ? "15/08/1998" : "10/12/2009";
    const docNum = kycType === "aadhaar" ? "XXXX XXXX 8940" : "ABCDE9842F";
    const docAge = calculateAge(docDob);

    setExtractedDob(docDob);
    setKycDocNum(docNum);

    if (docAge < 18) {
      setKycStatus("failed");
      setKycError("You must be 18 years or older to create an account.");
    } else {
      setKycStatus("verified");
      setKycError("");
    }
  };

  // Auto-resolve Bank Name from IFSC prefix
  const handleIfscChange = (text: string) => {
    const val = text.toUpperCase();
    setIfsc(val);
    if (bankError) setBankError("");

    if (val.length >= 4) {
      const prefix = val.slice(0, 4);
      if (prefix === "HDFC") {
        setBankName("HDFC Bank");
      } else if (prefix === "SBIN") {
        setBankName("State Bank of India");
      } else if (prefix === "ICIC") {
        setBankName("ICICI Bank");
      } else if (prefix === "UTIB") {
        setBankName("Axis Bank");
      } else if (prefix === "BARB") {
        setBankName("Bank of Baroda");
      } else if (prefix === "PUNB") {
        setBankName("Punjab National Bank");
      } else {
        setBankName("Verified Partner Bank");
      }
    } else {
      setBankName("");
    }
  };

  // Run Bank verification
  const runBankVerification = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (!accountNo || accountNo !== confirmAccountNo) {
      setBankError("Account numbers do not match");
      return;
    }
    if (accountNo.length < 8) {
      setBankError("Enter a valid account number");
      return;
    }
    if (ifsc.length !== 11) {
      setBankError("IFSC must be 11 characters");
      return;
    }

    setBankStatus("verifying");
    setBankError("");
    await new Promise((r) => setTimeout(r, 1500));

    setBankStatus("verified");
  };

  // Complete Registration & Log User In
  const handleFinalSubmit = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // 1. Create wallet user profile
    const newUser: VaultUser = {
      id: Date.now().toString(),
      name: fullName,
      phone: phone,
      balance: 10000, // Welcome balance
      upiLite: 500,
    };

    // Save profile locally
    await AsyncStorage.setItem(`@vault_user_profile_${phone}`, JSON.stringify(newUser));

    // 2. Add KYC document
    const newDoc: VaultDocument = {
      id: "doc_" + Date.now(),
      type: kycType,
      name: kycType === "aadhaar" ? "Aadhaar Card" : "PAN Card",
      number: kycDocNum,
    };
    addDocument(newDoc);

    // 3. Add bank account
    const newUPI: UPIAccount = {
      id: "upi_" + Date.now(),
      upiId: `${fullName.toLowerCase().replace(/\s+/g, "")}@${kycType === "aadhaar" ? "vault" : "bank"}`,
      name: bankName,
      primary: true,
      bank: bankName,
    };
    addUPIAccount(newUPI);

    router.replace("/(tabs)");
  };

  // Render Step 1: Basic Info Screen
  const renderInfoStep = () => (
    <Animated.View entering={FadeInRight.duration(350)} exiting={FadeOutLeft.duration(250)} style={styles.stepContainer}>
      <Text style={[styles.title, { color: colors.text }]}>Basic Information</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Enter your details exactly as shown on your documents.</Text>

      <View style={styles.inputLabelWrap}>
        <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Full Name</Text>
        <View style={[styles.fieldWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Feather name="user" size={18} color={colors.text} style={styles.fieldIcon} />
          <TextInput
            style={[styles.textInput, { color: colors.text }]}
            placeholder="Aryan Sharma"
            placeholderTextColor={colors.textTertiary}
            value={fullName}
            onChangeText={(t) => {
              setFullName(t);
              if (infoError) setInfoError("");
            }}
            selectionColor={colors.primary}
          />
        </View>
      </View>

      <View style={styles.inputLabelWrap}>
        <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Mobile Number</Text>
        <View style={[styles.fieldWrap, styles.disabledWrap, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <Feather name="phone" size={18} color={colors.textTertiary} style={styles.fieldIcon} />
          <TextInput
            style={[styles.textInput, { color: colors.textTertiary }]}
            placeholder="Mobile Number"
            placeholderTextColor={colors.textTertiary}
            value={phone}
            editable={false}
            keyboardType="phone-pad"
          />
        </View>
      </View>

      <View style={styles.inputLabelWrap}>
        <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Date of Birth (DD/MM/YYYY)</Text>
        <View style={[styles.fieldWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Feather name="calendar" size={18} color={colors.text} style={styles.fieldIcon} />
          <TextInput
            style={[styles.textInput, { color: colors.text }]}
            placeholder="15/08/2000"
            placeholderTextColor={colors.textTertiary}
            value={dob}
            onChangeText={handleDobChange}
            keyboardType="numeric"
            maxLength={10}
            selectionColor={colors.primary}
          />
        </View>
      </View>

      <View style={styles.inputLabelWrap}>
        <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Email Address (Optional)</Text>
        <View style={[styles.fieldWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Feather name="mail" size={18} color={colors.text} style={styles.fieldIcon} />
          <TextInput
            style={[styles.textInput, { color: colors.text }]}
            placeholder="name@email.com"
            placeholderTextColor={colors.textTertiary}
            value={email}
            onChangeText={(t) => setEmail(t)}
            keyboardType="email-address"
            autoCapitalize="none"
            selectionColor={colors.primary}
          />
        </View>
      </View>

      {!!infoError && (
        <View style={styles.errorBox}>
          <Feather name="alert-triangle" size={16} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{infoError}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.nextBtn} onPress={handleInfoNext} activeOpacity={0.85}>
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.btnGradient}
        >
          <Text style={styles.btnText}>Proceed to KYC</Text>
          <Feather name="arrow-right" size={18} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  // Render Step 2: KYC Screen
  const renderKycStep = () => (
    <Animated.View entering={FadeInRight.duration(350)} exiting={FadeOutLeft.duration(250)} style={styles.stepContainer}>
      <Text style={[styles.title, { color: colors.text }]}>KYC Verification</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Upload a valid identification card and verify matching identity.</Text>

      <View style={styles.kycTypeRow}>
        <TouchableOpacity
          style={[styles.kycTypeTab, { backgroundColor: colors.surface, borderColor: colors.border }, kycType === "aadhaar" && { backgroundColor: colors.surfaceElevated, borderColor: colors.primary }]}
          onPress={() => {
            if (Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            setKycType("aadhaar");
            setKycStatus("idle");
          }}
        >
          <Feather name="user" size={18} color={kycType === "aadhaar" ? colors.primary : colors.mutedForeground} />
          <Text style={[styles.kycTypeText, { color: kycType === "aadhaar" ? colors.primary : colors.mutedForeground }]}>Aadhaar Card</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.kycTypeTab, { backgroundColor: colors.surface, borderColor: colors.border }, kycType === "pan" && { backgroundColor: colors.surfaceElevated, borderColor: colors.primary }]}
          onPress={() => {
            if (Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            setKycType("pan");
            setKycStatus("idle");
          }}
        >
          <Feather name="credit-card" size={18} color={kycType === "pan" ? colors.primary : colors.mutedForeground} />
          <Text style={[styles.kycTypeText, { color: kycType === "pan" ? colors.primary : colors.mutedForeground }]}>PAN Card</Text>
        </TouchableOpacity>
      </View>

      {kycStatus === "idle" && (
        <View style={[styles.uploadPlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Feather name="upload-cloud" size={44} color={colors.text} />
          <Text style={[styles.uploadTitle, { color: colors.text }]}>Scan or Upload Document</Text>
          <Text style={[styles.uploadSub, { color: colors.textTertiary }]}>Select a demo scenario below to simulate verification</Text>
        </View>
      )}

      {kycStatus === "scanning" && (
        <View style={[styles.scannerBox, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.scanLogText, { color: colors.text }]}>{kycLog}</Text>
          <LinearGradient
            colors={[`${colors.primary}66`, `${colors.primary}00`]}
            style={styles.laserLine}
          />
        </View>
      )}

      {kycStatus === "verified" && (
        <View style={[styles.verifiedKycBox, { backgroundColor: colors.surface, borderColor: colors.success }]}>
          <View style={styles.verifiedHeader}>
            <Feather name="check-circle" size={32} color={colors.success} />
            <Text style={[styles.verifiedTitle, { color: colors.success }]}>KYC Verified Successfully</Text>
          </View>
          <View style={styles.verifiedDetails}>
            <Text style={[styles.verifiedDetailText, { color: colors.mutedForeground }]}>
              <Text style={[styles.bold, { color: colors.text }]}>Document:</Text> {kycType.toUpperCase()} ({kycDocNum})
            </Text>
            <Text style={[styles.verifiedDetailText, { color: colors.mutedForeground }]}>
              <Text style={[styles.bold, { color: colors.text }]}>Extracted DOB:</Text> {extractedDob}
            </Text>
            <Text style={[styles.verifiedDetailText, { color: colors.mutedForeground }]}>
              <Text style={[styles.bold, { color: colors.text }]}>Identity Match Score:</Text> 98.4% Match
            </Text>
          </View>
        </View>
      )}

      {kycStatus === "failed" && (
        <View style={[styles.failedKycBox, { backgroundColor: colors.surface, borderColor: colors.error }]}>
          <View style={styles.verifiedHeader}>
            <Feather name="x-circle" size={32} color={colors.error} />
            <Text style={[styles.failedTitle, { color: colors.error }]}>KYC Verification Blocked</Text>
          </View>
          <Text style={[styles.failedReasonText, { color: colors.error }]}>{kycError}</Text>
          <Text style={[styles.failedExtractedDob, { color: colors.textTertiary }]}>Extracted DOB from Document: {extractedDob}</Text>
        </View>
      )}

      {kycStatus === "idle" && (
        <View style={[styles.demoKycSelector, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.demoTitle, { color: colors.text }]}>Simulate Scan Options:</Text>
          <TouchableOpacity
            style={[styles.demoBtn, { backgroundColor: colors.surfaceElevated }]}
            onPress={() => runKycVerification("valid")}
          >
            <Feather name="play-circle" size={18} color={colors.success} />
            <Text style={[styles.demoBtnText, { color: colors.text }]}>Simulate Valid KYC (Age 27)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.demoBtn, { backgroundColor: colors.surfaceElevated }]}
            onPress={() => runKycVerification("underage")}
          >
            <Feather name="alert-triangle" size={18} color={colors.error} />
            <Text style={[styles.demoBtnText, { color: colors.error }]}>Simulate Underage (Age 16)</Text>
          </TouchableOpacity>
        </View>
      )}

      {kycStatus === "verified" && (
        <TouchableOpacity
          style={styles.nextBtn}
          onPress={() => {
            if (Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            setCurrentStep("bank");
          }}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btnGradient}
          >
            <Text style={styles.btnText}>Proceed to Bank Setup</Text>
            <Feather name="arrow-right" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {kycStatus === "failed" && (
        <TouchableOpacity
          style={[styles.nextBtn, styles.blockedBtn]}
          disabled
        >
          <View style={[styles.blockedContent, { backgroundColor: colors.surfaceElevated }]}>
            <Feather name="lock" size={18} color={colors.textTertiary} />
            <Text style={[styles.blockedBtnText, { color: colors.textTertiary }]}>Registration Blocked</Text>
          </View>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.backLink}
        onPress={() => {
          if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          setCurrentStep("info");
        }}
      >
        <Text style={[styles.backLinkText, { color: colors.primary }]}>Back to Profile Info</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  // Render Step 3: Bank Verification Screen
  const renderBankStep = () => (
    <Animated.View entering={FadeInRight.duration(350)} exiting={FadeOutLeft.duration(250)} style={styles.stepContainer}>
      <Text style={[styles.title, { color: colors.text }]}>Bank Verification</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Link a primary bank account to fund your Vault wallet.</Text>

      <View style={styles.inputLabelWrap}>
        <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>IFSC Code</Text>
        <View style={[styles.fieldWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Feather name="hash" size={18} color={colors.text} style={styles.fieldIcon} />
          <TextInput
            style={[styles.textInput, { color: colors.text }]}
            placeholder="HDFC0000240"
            placeholderTextColor={colors.textTertiary}
            value={ifsc}
            onChangeText={handleIfscChange}
            maxLength={11}
            autoCapitalize="characters"
            selectionColor={colors.primary}
          />
        </View>
      </View>

      {!!bankName && (
        <View style={[styles.bankNameBox, { backgroundColor: `${colors.primary}1a`, borderColor: `${colors.primary}33` }]}>
          <Feather name="briefcase" size={16} color={colors.primary} />
          <Text style={[styles.bankNameText, { color: colors.mutedForeground }]}>Resolved Bank: <Text style={[styles.bold, { color: colors.text }]}>{bankName}</Text></Text>
        </View>
      )}

      <View style={styles.inputLabelWrap}>
        <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Account Number</Text>
        <View style={[styles.fieldWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Feather name="credit-card" size={18} color={colors.text} style={styles.fieldIcon} />
          <TextInput
            style={[styles.textInput, { color: colors.text }]}
            placeholder="123456789012"
            placeholderTextColor={colors.textTertiary}
            value={accountNo}
            onChangeText={(t) => {
              setAccountNo(t);
              if (bankError) setBankError("");
            }}
            keyboardType="numeric"
            selectionColor={colors.primary}
          />
        </View>
      </View>

      <View style={styles.inputLabelWrap}>
        <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Confirm Account Number</Text>
        <View style={[styles.fieldWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Feather name="credit-card" size={18} color={colors.text} style={styles.fieldIcon} />
          <TextInput
            style={[styles.textInput, { color: colors.text }]}
            placeholder="Re-enter Account Number"
            placeholderTextColor={colors.textTertiary}
            value={confirmAccountNo}
            onChangeText={(t) => {
              setConfirmAccountNo(t);
              if (bankError) setBankError("");
            }}
            keyboardType="numeric"
            selectionColor={colors.primary}
          />
        </View>
      </View>

      {!!bankError && (
        <View style={styles.errorBox}>
          <Feather name="alert-triangle" size={16} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{bankError}</Text>
        </View>
      )}

      {bankStatus === "verifying" && (
        <View style={styles.verifyingBankLoader}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.verifyingBankText, { color: colors.text }]}>Verifying bank ownership...</Text>
        </View>
      )}

      {bankStatus === "verified" && (
        <View style={[styles.verifiedBankBox, { backgroundColor: `${colors.success}1a`, borderColor: `${colors.success}33` }]}>
          <Feather name="check-circle" size={18} color={colors.success} />
          <Text style={[styles.verifiedBankText, { color: colors.success }]}>Bank Account Verified Successfully</Text>
        </View>
      )}

      {bankStatus === "idle" && (
        <TouchableOpacity style={styles.nextBtn} onPress={runBankVerification} activeOpacity={0.85}>
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btnGradient}
          >
            <Text style={styles.btnText}>Verify Bank Account</Text>
            <Feather name="check" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {bankStatus === "verified" && (
        <TouchableOpacity style={styles.nextBtn} onPress={handleFinalSubmit} activeOpacity={0.85}>
          <LinearGradient
            colors={[colors.success, "#1B5E20"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btnGradient}
          >
            <Text style={styles.btnText}>Create Wallet & Complete</Text>
            <Feather name="check-circle" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.backLink}
        onPress={() => {
          if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          setCurrentStep("kyc");
        }}
      >
        <Text style={[styles.backLinkText, { color: colors.primary }]}>Back to KYC</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const getStepIndex = () => {
    if (currentStep === "info") return 0;
    if (currentStep === "kyc") return 1;
    return 2;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          {/* Progress Header */}
          <View style={[styles.progressHeader, { paddingTop: topPad, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <Text style={[styles.progressTitle, { color: colors.text }]}>Vault Setup</Text>
            <View style={styles.progressRow}>
              {[0, 1, 2].map((idx) => (
                <React.Fragment key={idx}>
                  <View style={styles.progressStepWrap}>
                    <View
                      style={[
                        styles.progressStepNum,
                        {
                          backgroundColor: getStepIndex() >= idx ? colors.primary : colors.surfaceElevated,
                        },
                      ]}
                    >
                      <Text style={[styles.progressStepNumText, { color: getStepIndex() >= idx ? "#FFF" : colors.textTertiary }]}>
                        {idx + 1}
                      </Text>
                    </View>
                    <Text style={[styles.progressStepLabel, { color: getStepIndex() >= idx ? colors.text : colors.textTertiary }]}>
                      {["Profile", "KYC", "Bank"][idx]}
                    </Text>
                  </View>
                  {idx < 2 && (
                    <View style={[styles.progressLine, { backgroundColor: getStepIndex() > idx ? colors.primary : colors.surfaceElevated }]} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>

          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={{ flex: 1, paddingBottom: bottomPad + 30 }}>
              {currentStep === "info" && renderInfoStep()}
              {currentStep === "kyc" && renderKycStep()}
              {currentStep === "bank" && renderBankStep()}
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
  },
  scrollContent: {
    flexGrow: 1,
  },
  progressHeader: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  progressTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 16,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressStepWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  progressStepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  progressStepNumText: {
    fontSize: 12,
    fontWeight: "700",
  },
  progressStepLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  progressLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 12,
    borderRadius: 1,
  },
  stepContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  inputLabelWrap: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  fieldWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
  },
  disabledWrap: {
    opacity: 0.6,
  },
  fieldIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    paddingVertical: 14,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    marginBottom: 20,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  nextBtn: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 10,
    marginBottom: 8,
  },
  btnGradient: {
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  btnText: {
    color: "#FFFDF9",
    fontSize: 16,
    fontWeight: "700",
  },
  kycTypeRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  kycTypeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    paddingVertical: 14,
    borderRadius: 14,
  },
  kycTypeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  uploadPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderStyle: "dashed",
    paddingVertical: 44,
    borderRadius: 20,
    marginBottom: 24,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
  },
  uploadSub: {
    fontSize: 12,
    marginTop: 4,
  },
  scannerBox: {
    borderWidth: 1.5,
    paddingVertical: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    position: "relative",
    overflow: "hidden",
  },
  scanLogText: {
    fontSize: 14,
    marginTop: 16,
    fontWeight: "600",
  },
  laserLine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  verifiedKycBox: {
    borderWidth: 1.5,
    padding: 20,
    borderRadius: 20,
    marginBottom: 24,
  },
  failedKycBox: {
    borderWidth: 1.5,
    padding: 20,
    borderRadius: 20,
    marginBottom: 24,
  },
  verifiedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  verifiedTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  failedTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  verifiedDetails: {
    gap: 8,
  },
  verifiedDetailText: {
    fontSize: 14,
  },
  failedReasonText: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  failedExtractedDob: {
    fontSize: 13,
  },
  bold: {
    fontWeight: "700",
  },
  demoKycSelector: {
    padding: 16,
    borderRadius: 16,
    gap: 10,
    marginBottom: 20,
    borderWidth: 1.5,
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  demoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  demoBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  backLink: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 8,
  },
  backLinkText: {
    fontSize: 14,
    fontWeight: "600",
  },
  bankNameBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
  },
  bankNameText: {
    fontSize: 13,
  },
  verifyingBankLoader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  verifyingBankText: {
    fontSize: 14,
    fontWeight: "600",
  },
  verifiedBankBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  verifiedBankText: {
    fontSize: 14,
    fontWeight: "600",
  },
  blockedBtn: {
    opacity: 0.6,
  },
  blockedContent: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },
  blockedBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
