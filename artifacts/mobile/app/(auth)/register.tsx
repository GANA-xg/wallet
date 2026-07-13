import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/context/WalletContext";
import type { UPIAccount, VaultDocument, VaultUser } from "@/types";

type Step = "info" | "kyc" | "bank";

export default function Register() {
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
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Basic Information</Text>
      <Text style={styles.subtitle}>Enter your details exactly as shown on your documents.</Text>

      <View style={styles.inputLabelWrap}>
        <Text style={styles.inputLabel}>Full Name</Text>
        <View style={styles.fieldWrap}>
          <Feather name="user" size={18} color="#F4F4F5" style={styles.fieldIcon} />
          <TextInput
            style={styles.textInput}
            placeholder="Aryan Sharma"
            placeholderTextColor="#6B7280"
            value={fullName}
            onChangeText={(t) => {
              setFullName(t);
              if (infoError) setInfoError("");
            }}
            selectionColor="#F4F4F5"
          />
        </View>
      </View>

      <View style={styles.inputLabelWrap}>
        <Text style={styles.inputLabel}>Mobile Number</Text>
        <View style={[styles.fieldWrap, styles.disabledWrap]}>
          <Feather name="phone" size={18} color="#6B7280" style={styles.fieldIcon} />
          <TextInput
            style={[styles.textInput, styles.disabledInput]}
            placeholder="Mobile Number"
            placeholderTextColor="#6B7280"
            value={phone}
            editable={false}
            keyboardType="phone-pad"
          />
        </View>
      </View>

      <View style={styles.inputLabelWrap}>
        <Text style={styles.inputLabel}>Date of Birth (DD/MM/YYYY)</Text>
        <View style={styles.fieldWrap}>
          <Feather name="calendar" size={18} color="#F4F4F5" style={styles.fieldIcon} />
          <TextInput
            style={styles.textInput}
            placeholder="15/08/2000"
            placeholderTextColor="#6B7280"
            value={dob}
            onChangeText={handleDobChange}
            keyboardType="numeric"
            maxLength={10}
            selectionColor="#F4F4F5"
          />
        </View>
      </View>

      <View style={styles.inputLabelWrap}>
        <Text style={styles.inputLabel}>Email Address (Optional)</Text>
        <View style={styles.fieldWrap}>
          <Feather name="mail" size={18} color="#F4F4F5" style={styles.fieldIcon} />
          <TextInput
            style={styles.textInput}
            placeholder="name@email.com"
            placeholderTextColor="#6B7280"
            value={email}
            onChangeText={(t) => setEmail(t)}
            keyboardType="email-address"
            autoCapitalize="none"
            selectionColor="#F4F4F5"
          />
        </View>
      </View>

      {!!infoError && (
        <View style={styles.errorBox}>
          <Feather name="alert-triangle" size={16} color="#EF4444" />
          <Text style={styles.errorText}>{infoError}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.nextBtn} onPress={handleInfoNext} activeOpacity={0.85}>
        <LinearGradient
          colors={["#F4F4F5", "#D4D4D8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.btnGradient}
        >
          <Text style={styles.btnText}>Proceed to KYC</Text>
          <Feather name="arrow-right" size={18} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  // Render Step 2: KYC Screen
  const renderKycStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>KYC Verification</Text>
      <Text style={styles.subtitle}>Upload a valid identification card and verify matching identity.</Text>

      <View style={styles.kycTypeRow}>
        <TouchableOpacity
          style={[styles.kycTypeTab, kycType === "aadhaar" && styles.kycTypeActive]}
          onPress={() => {
            setKycType("aadhaar");
            setKycStatus("idle");
          }}
        >
          <Feather name="user" size={18} color={kycType === "aadhaar" ? "#F4F4F5" : "#B0B7C3"} />
          <Text style={[styles.kycTypeText, kycType === "aadhaar" && styles.kycTypeActiveText]}>Aadhaar Card</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.kycTypeTab, kycType === "pan" && styles.kycTypeActive]}
          onPress={() => {
            setKycType("pan");
            setKycStatus("idle");
          }}
        >
          <Feather name="credit-card" size={18} color={kycType === "pan" ? "#F4F4F5" : "#B0B7C3"} />
          <Text style={[styles.kycTypeText, kycType === "pan" && styles.kycTypeActiveText]}>PAN Card</Text>
        </TouchableOpacity>
      </View>

      {kycStatus === "idle" && (
        <View style={styles.uploadPlaceholder}>
          <Feather name="upload-cloud" size={44} color="#F4F4F5" />
          <Text style={styles.uploadTitle}>Scan or Upload Document</Text>
          <Text style={styles.uploadSub}>Select a demo scenario below to simulate verification</Text>
        </View>
      )}

      {kycStatus === "scanning" && (
        <View style={styles.scannerBox}>
          <ActivityIndicator size="large" color="#F4F4F5" />
          <Text style={styles.scanLogText}>{kycLog}</Text>
          <LinearGradient
            colors={["rgba(255, 107, 0, 0.4)", "rgba(255, 146, 64, 0.0)"]}
            style={styles.laserLine}
          />
        </View>
      )}

      {kycStatus === "verified" && (
        <View style={styles.verifiedKycBox}>
          <View style={styles.verifiedHeader}>
            <Feather name="check-circle" size={32} color="#22C55E" />
            <Text style={styles.verifiedTitle}>KYC Verified Successfully</Text>
          </View>
          <View style={styles.verifiedDetails}>
            <Text style={styles.verifiedDetailText}>
              <Text style={styles.bold}>Document:</Text> {kycType.toUpperCase()} ({kycDocNum})
            </Text>
            <Text style={styles.verifiedDetailText}>
              <Text style={styles.bold}>Extracted DOB:</Text> {extractedDob}
            </Text>
            <Text style={styles.verifiedDetailText}>
              <Text style={styles.bold}>Identity Match Score:</Text> 98.4% Match
            </Text>
          </View>
        </View>
      )}

      {kycStatus === "failed" && (
        <View style={styles.failedKycBox}>
          <View style={styles.verifiedHeader}>
            <Feather name="x-circle" size={32} color="#EF4444" />
            <Text style={styles.failedTitle}>KYC Verification Blocked</Text>
          </View>
          <Text style={styles.failedReasonText}>{kycError}</Text>
          <Text style={styles.failedExtractedDob}>Extracted DOB from Document: {extractedDob}</Text>
        </View>
      )}

      {kycStatus === "idle" && (
        <View style={styles.demoKycSelector}>
          <Text style={styles.demoTitle}>Simulate Scan Options:</Text>
          <TouchableOpacity
            style={styles.demoBtn}
            onPress={() => runKycVerification("valid")}
          >
            <Feather name="play-circle" size={18} color="#22C55E" />
            <Text style={styles.demoBtnText}>Simulate Valid KYC (Age 27)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.demoBtn, styles.demoBtnDanger]}
            onPress={() => runKycVerification("underage")}
          >
            <Feather name="alert-triangle" size={18} color="#EF4444" />
            <Text style={[styles.demoBtnText, styles.dangerText]}>Simulate Underage (Age 16)</Text>
          </TouchableOpacity>
        </View>
      )}

      {kycStatus === "verified" && (
        <TouchableOpacity
          style={styles.nextBtn}
          onPress={() => setCurrentStep("bank")}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#F4F4F5", "#D4D4D8"]}
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
          <View style={styles.blockedContent}>
            <Feather name="lock" size={18} color="#6B7280" />
            <Text style={styles.blockedBtnText}>Registration Blocked</Text>
          </View>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.backLink}
        onPress={() => setCurrentStep("info")}
      >
        <Text style={styles.backLinkText}>Back to Profile Info</Text>
      </TouchableOpacity>
    </View>
  );

  // Render Step 3: Bank Verification Screen
  const renderBankStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.title}>Bank Verification</Text>
      <Text style={styles.subtitle}>Link a primary bank account to fund your Vault wallet.</Text>

      <View style={styles.inputLabelWrap}>
        <Text style={styles.inputLabel}>IFSC Code</Text>
        <View style={styles.fieldWrap}>
          <Feather name="hash" size={18} color="#F4F4F5" style={styles.fieldIcon} />
          <TextInput
            style={styles.textInput}
            placeholder="HDFC0000240"
            placeholderTextColor="#6B7280"
            value={ifsc}
            onChangeText={handleIfscChange}
            maxLength={11}
            autoCapitalize="characters"
            selectionColor="#F4F4F5"
          />
        </View>
      </View>

      {!!bankName && (
        <View style={styles.bankNameBox}>
          <Feather name="briefcase" size={16} color="#F4F4F5" />
          <Text style={styles.bankNameText}>Resolved Bank: <Text style={styles.bold}>{bankName}</Text></Text>
        </View>
      )}

      <View style={styles.inputLabelWrap}>
        <Text style={styles.inputLabel}>Account Number</Text>
        <View style={styles.fieldWrap}>
          <Feather name="credit-card" size={18} color="#F4F4F5" style={styles.fieldIcon} />
          <TextInput
            style={styles.textInput}
            placeholder="123456789012"
            placeholderTextColor="#6B7280"
            value={accountNo}
            onChangeText={(t) => {
              setAccountNo(t);
              if (bankError) setBankError("");
            }}
            keyboardType="numeric"
            selectionColor="#F4F4F5"
          />
        </View>
      </View>

      <View style={styles.inputLabelWrap}>
        <Text style={styles.inputLabel}>Confirm Account Number</Text>
        <View style={styles.fieldWrap}>
          <Feather name="credit-card" size={18} color="#F4F4F5" style={styles.fieldIcon} />
          <TextInput
            style={styles.textInput}
            placeholder="Re-enter Account Number"
            placeholderTextColor="#6B7280"
            value={confirmAccountNo}
            onChangeText={(t) => {
              setConfirmAccountNo(t);
              if (bankError) setBankError("");
            }}
            keyboardType="numeric"
            selectionColor="#F4F4F5"
          />
        </View>
      </View>

      {!!bankError && (
        <View style={styles.errorBox}>
          <Feather name="alert-triangle" size={16} color="#EF4444" />
          <Text style={styles.errorText}>{bankError}</Text>
        </View>
      )}

      {bankStatus === "verifying" && (
        <View style={styles.verifyingBankLoader}>
          <ActivityIndicator size="small" color="#F4F4F5" />
          <Text style={styles.verifyingBankText}>Verifying bank ownership...</Text>
        </View>
      )}

      {bankStatus === "verified" && (
        <View style={styles.verifiedBankBox}>
          <Feather name="check-circle" size={18} color="#22C55E" />
          <Text style={styles.verifiedBankText}>Bank Account Verified Successfully</Text>
        </View>
      )}

      {bankStatus === "idle" && (
        <TouchableOpacity style={styles.nextBtn} onPress={runBankVerification} activeOpacity={0.85}>
          <LinearGradient
            colors={["#F4F4F5", "#D4D4D8"]}
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
            colors={["#22C55E", "#10B981"]}
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
        onPress={() => setCurrentStep("kyc")}
      >
        <Text style={styles.backLinkText}>Back to KYC</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          {/* Progress Header */}
          <View style={[styles.progressHeader, { paddingTop: topPad }]}>
            <Text style={styles.progressTitle}>Vault Setup</Text>
            <View style={styles.progressRow}>
              <View style={[styles.progressStep, currentStep === "info" && styles.progressStepActive, (currentStep === "kyc" || currentStep === "bank") && styles.progressStepDone]}>
                <Text style={styles.progressStepNum}>1</Text>
                <Text style={styles.progressStepLabel}>Profile</Text>
              </View>
              <View style={styles.progressLine} />
              <View style={[styles.progressStep, currentStep === "kyc" && styles.progressStepActive, currentStep === "bank" && styles.progressStepDone]}>
                <Text style={styles.progressStepNum}>2</Text>
                <Text style={styles.progressStepLabel}>KYC</Text>
              </View>
              <View style={styles.progressLine} />
              <View style={[styles.progressStep, currentStep === "bank" && styles.progressStepActive]}>
                <Text style={styles.progressStepNum}>3</Text>
                <Text style={styles.progressStepLabel}>Bank</Text>
              </View>
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
    backgroundColor: "#0F1115",
  },
  scrollContent: {
    flexGrow: 1,
  },
  progressHeader: {
    backgroundColor: "#171A21",
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#262B36",
  },
  progressTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 16,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressStep: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    opacity: 0.4,
  },
  progressStepActive: {
    opacity: 1,
  },
  progressStepDone: {
    opacity: 0.8,
  },
  progressStepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#262B36",
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 24,
  },
  progressStepLabel: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  progressLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: "#262B36",
    marginHorizontal: 12,
  },
  stepContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#B0B7C3",
    marginBottom: 24,
    lineHeight: 20,
  },
  inputLabelWrap: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    color: "#B0B7C3",
    fontWeight: "600",
    marginBottom: 8,
  },
  fieldWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#171A21",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#262B36",
    paddingHorizontal: 16,
  },
  disabledWrap: {
    backgroundColor: "#0d0f13",
    borderColor: "#171a21",
  },
  disabledInput: {
    color: "#6B7280",
  },
  fieldIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    color: "#fff",
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
    color: "#EF4444",
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
    color: "#fff",
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
    backgroundColor: "#171A21",
    borderWidth: 1.5,
    borderColor: "#262B36",
    paddingVertical: 14,
    borderRadius: 14,
  },
  kycTypeActive: {
    borderColor: "#F4F4F5",
    backgroundColor: "#1a1208",
  },
  kycTypeText: {
    color: "#B0B7C3",
    fontSize: 14,
    fontWeight: "600",
  },
  kycTypeActiveText: {
    color: "#F4F4F5",
  },
  uploadPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#171A21",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#262B36",
    paddingVertical: 44,
    borderRadius: 20,
    marginBottom: 24,
  },
  uploadTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
  },
  uploadSub: {
    color: "#6B7280",
    fontSize: 12,
    marginTop: 4,
  },
  scannerBox: {
    backgroundColor: "#171A21",
    borderWidth: 1.5,
    borderColor: "#F4F4F5",
    paddingVertical: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    position: "relative",
    overflow: "hidden",
  },
  scanLogText: {
    color: "#fff",
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
    backgroundColor: "#171A21",
    borderWidth: 1.5,
    borderColor: "#22C55E",
    padding: 20,
    borderRadius: 20,
    marginBottom: 24,
  },
  failedKycBox: {
    backgroundColor: "#171A21",
    borderWidth: 1.5,
    borderColor: "#EF4444",
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
    color: "#22C55E",
    fontSize: 16,
    fontWeight: "700",
  },
  failedTitle: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "700",
  },
  verifiedDetails: {
    gap: 8,
  },
  verifiedDetailText: {
    color: "#B0B7C3",
    fontSize: 14,
  },
  failedReasonText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  failedExtractedDob: {
    color: "#6B7280",
    fontSize: 13,
  },
  bold: {
    fontWeight: "700",
    color: "#fff",
  },
  demoKycSelector: {
    backgroundColor: "#171A21",
    padding: 16,
    borderRadius: 16,
    gap: 10,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: "#262B36",
  },
  demoTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  demoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#262B36",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  demoBtnDanger: {
    backgroundColor: "#2d1616",
  },
  dangerText: {
    color: "#EF4444",
  },
  demoBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  backLink: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 8,
  },
  backLinkText: {
    color: "#F4F4F5",
    fontSize: 14,
    fontWeight: "600",
  },
  bankNameBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1a1208",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 107, 0, 0.2)",
  },
  bankNameText: {
    color: "#B0B7C3",
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
    color: "#F4F4F5",
    fontSize: 14,
    fontWeight: "600",
  },
  verifiedBankBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.2)",
    marginBottom: 20,
  },
  verifiedBankText: {
    color: "#22C55E",
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
    backgroundColor: "#262B36",
    paddingVertical: 16,
  },
  blockedBtnText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "700",
  },
});
