import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import React, { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import type { DocumentType, VaultDocument, VerificationStatus, DocumentMetadata } from "@/types";
import { recognizeDocumentText, getOcrErrorMessage } from "@/services/documents/ocrService";
import { parseDocumentText } from "@/services/documents/documentParser";
import { preprocessDocumentImage } from "@/services/documents/imagePreprocess";
import { validateDocumentImage } from "@/services/documents/imageQuality";
import spacing from "@/constants/spacing";
import radius from "@/constants/radius";

interface AddDocumentSheetProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (document: VaultDocument) => void;
  existingTypes: DocumentType[];
}

type FlowStage = "select" | "processing" | "quality_failed" | "review";

const DOC_CATEGORIES: { type: DocumentType; label: string; icon: keyof typeof Feather.glyphMap; color: string }[] = [
  { type: "aadhaar", label: "Aadhaar Card", icon: "credit-card", color: "#D06224" },
  { type: "pan", label: "PAN Card", icon: "credit-card", color: "#EAC891" },
  { type: "driving_license", label: "Driving License", icon: "navigation", color: "#2E7D32" },
  { type: "passport", label: "Passport", icon: "globe", color: "#AE431E" },
  { type: "vehicle_rc", label: "Vehicle RC", icon: "truck", color: "#D06224" },
  { type: "membership", label: "Membership Card", icon: "award", color: "#754F4D" },
  { type: "college_id", label: "College ID Card", icon: "book-open", color: "#2E7D32" },
  { type: "custom", label: "Custom", icon: "file-text", color: "#6B6B6B" },
];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function maskDocumentNumber(number: string): string {
  const digits = number.replace(/\D/g, "");
  if (digits.length <= 4) return number;
  const visible = digits.slice(-4);
  const masked = digits.slice(0, -4).replace(/\d/g, "X");
  const combined = masked + visible;
  if (combined.length > 8) {
    return combined.replace(/(.{4})/g, "$1 ").trim();
  }
  return combined;
}

function getDocLabel(type: DocumentType): string {
  return DOC_CATEGORIES.find((c) => c.type === type)?.label ?? "Document";
}

export default function AddDocumentSheet({ visible, onClose, onAdd, existingTypes }: AddDocumentSheetProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [selectedType, setSelectedType] = useState<DocumentType>("aadhaar");
  const [stage, setStage] = useState<FlowStage>("select");
  const [processingMessage, setProcessingMessage] = useState("");
  const [showTypePicker, setShowTypePicker] = useState(false);

  const [holderName, setHolderName] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [metadata, setMetadata] = useState<DocumentMetadata>({});
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [ocrRawText, setOcrRawText] = useState("");
  const [fieldsDetected, setFieldsDetected] = useState<string[]>([]);
  const [totalFields, setTotalFields] = useState(0);
  const [qualityFailedMessage, setQualityFailedMessage] = useState("");
  const [ocrErrorMessage, setOcrErrorMessage] = useState("");

  const resetState = useCallback(() => {
    setStage("select");
    setSelectedType("aadhaar");
    setHolderName("");
    setDocumentNumber("");
    setMetadata({});
    setCapturedImageUri(null);
    setOcrRawText("");
    setProcessingMessage("");
    setShowTypePicker(false);
    setFieldsDetected([]);
    setTotalFields(0);
    setQualityFailedMessage("");
    setOcrErrorMessage("");
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const processImage = useCallback(
    async (imageUri: string) => {
      setStage("processing");
      setProcessingMessage("Preprocessing image...");

      try {
        const preprocessed = await preprocessDocumentImage(imageUri);
        const processedUri = preprocessed.uri;

        setProcessingMessage("Checking image quality...");
        const quality = await validateDocumentImage(
          processedUri,
          preprocessed.width,
          preprocessed.height,
        );

        if (!quality.passed) {
          setQualityFailedMessage(quality.message);
          setCapturedImageUri(processedUri);
          setStage("quality_failed");
          return;
        }

        setProcessingMessage("Running text recognition...");
        const ocrResult = await recognizeDocumentText(processedUri);

        if (!ocrResult.diagnostics.mlKitLoaded) {
          setOcrErrorMessage(getOcrErrorMessage(ocrResult.diagnostics));
          setCapturedImageUri(processedUri);
          setOcrRawText("");
          setStage("review");
          return;
        }

        setProcessingMessage("Extracting fields...");
        const parsed = parseDocumentText(selectedType, ocrResult.rawText);

        setHolderName(parsed.holderName);
        setDocumentNumber(parsed.documentNumber);
        setMetadata(parsed.metadata);
        setCapturedImageUri(processedUri);
        setOcrRawText(ocrResult.rawText);
        setFieldsDetected(parsed.fieldsDetected);
        setTotalFields(parsed.totalFields);
        setOcrErrorMessage("");
        setStage("review");
      } catch {
        setOcrErrorMessage("An unexpected error occurred during processing. Please try again.");
        setCapturedImageUri(imageUri);
        setOcrRawText("");
        setStage("review");
      }
    },
    [selectedType],
  );

  const handleScan = useCallback(async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Camera Required", "Please grant camera access to scan documents.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        await processImage(result.assets[0].uri);
      }
    } catch {
      Alert.alert("Error", "Failed to open camera. Please try again.");
    }
  }, [processImage]);

  const handleUpload = useCallback(async () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Please grant photo library access to upload documents.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.9,
      });

      if (!result.canceled && result.assets[0]) {
        await processImage(result.assets[0].uri);
      }
    } catch {
      Alert.alert("Error", "Failed to open gallery. Please try again.");
    }
  }, [processImage]);

  const handleSave = useCallback(() => {
    if (!documentNumber.trim()) {
      Alert.alert("Required", "Please enter a document number.");
      return;
    }
    if (!holderName.trim()) {
      Alert.alert("Required", "Please enter the holder name.");
      return;
    }

    const now = new Date().toISOString();
    const doc: VaultDocument = {
      id: generateId(),
      userId: user?.id ?? "local",
      type: selectedType,
      name: getDocLabel(selectedType),
      holderName: holderName.trim(),
      documentNumber: documentNumber.trim(),
      maskedNumber: maskDocumentNumber(documentNumber.trim()),
      verificationStatus: "pending" as VerificationStatus,
      metadata: { ...metadata },
      encryptedFileUri: capturedImageUri ?? undefined,
      createdAt: now,
      updatedAt: now,
    };

    onAdd(doc);
    handleClose();
  }, [selectedType, holderName, documentNumber, metadata, capturedImageUri, onAdd, handleClose]);

  const updateMeta = (key: keyof DocumentMetadata, value: string) => {
    setMetadata((prev) => ({ ...prev, [key]: value || undefined }));
  };

  const selectedCategory = DOC_CATEGORIES.find((c) => c.type === selectedType);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.base }]}>
          <View style={styles.handle} />

          {stage === "select" && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Add Document</Text>
              <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>
                Choose document type and how you'd like to add it
              </Text>

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Document Type *</Text>
              <TouchableOpacity
                style={[styles.dropdown, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowTypePicker(true);
                }}
                activeOpacity={0.7}
              >
                {selectedCategory && (
                  <Feather name={selectedCategory.icon} size={16} color={selectedCategory.color} />
                )}
                <Text style={[styles.dropdownText, { color: colors.text }]}>
                  {selectedCategory?.label ?? "Select type"}
                </Text>
                <Feather name="chevron-down" size={16} color={colors.textTertiary} />
              </TouchableOpacity>

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>How would you like to add?</Text>

              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                onPress={handleScan}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: colors.primary + "15" }]}>
                  <Feather name="camera" size={22} color={colors.primary} />
                </View>
                <View style={styles.actionInfo}>
                  <Text style={[styles.actionTitle, { color: colors.text }]}>Scan Physical Card</Text>
                  <Text style={[styles.actionSub, { color: colors.textSecondary }]}>
                    Turn a physical card into a secure digital card
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.textTertiary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                onPress={handleUpload}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: colors.accent + "15" }]}>
                  <Feather name="upload" size={22} color={colors.accent} />
                </View>
                <View style={styles.actionInfo}>
                  <Text style={[styles.actionTitle, { color: colors.text }]}>Upload PDF / Image</Text>
                  <Text style={[styles.actionSub, { color: colors.textSecondary }]}>
                    Import an existing document file
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            </ScrollView>
          )}

          {stage === "processing" && (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.processingTitle, { color: colors.text }]}>Processing Document</Text>
              <Text style={[styles.processingSub, { color: colors.textSecondary }]}>{processingMessage}</Text>
            </View>
          )}

          {stage === "quality_failed" && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.reviewHeader}>
                <TouchableOpacity onPress={() => setStage("select")} style={styles.backBtn}>
                  <Feather name="arrow-left" size={20} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.sheetTitle, { color: colors.text }]}>Image Quality</Text>
                <View style={{ width: 28 }} />
              </View>

              <View style={[styles.qualityFailContainer, { backgroundColor: colors.warning + "10" }]}>
                <Feather name="alert-triangle" size={32} color={colors.warning} />
                <Text style={[styles.qualityFailTitle, { color: colors.text }]}>
                  We couldn't confidently read this document.
                </Text>
                <Text style={[styles.qualityFailMessage, { color: colors.textSecondary }]}>
                  {qualityFailedMessage || "Please retake the photo in good lighting while keeping all four edges visible."}
                </Text>
                <TouchableOpacity
                  style={[styles.retryBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setStage("select")}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.retryBtnText, { color: colors.primaryForeground }]}>Try Again</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.manualEntryBtn}
                  onPress={() => {
                    setQualityFailedMessage("");
                    setStage("review");
                  }}
                >
                  <Text style={[styles.manualEntryBtnText, { color: colors.textSecondary }]}>
                    Enter Details Manually
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {stage === "review" && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.reviewHeader}>
                <TouchableOpacity onPress={() => setStage("select")} style={styles.backBtn}>
                  <Feather name="arrow-left" size={20} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.sheetTitle, { color: colors.text }]}>Review Extracted Information</Text>
                <View style={{ width: 28 }} />
              </View>

              {selectedCategory && (
                <View style={[styles.selectedTypeBanner, { backgroundColor: selectedCategory.color + "15" }]}>
                  <Feather name={selectedCategory.icon} size={16} color={selectedCategory.color} />
                  <Text style={[styles.bannerText, { color: selectedCategory.color }]}>
                    {selectedCategory.label}
                  </Text>
                </View>
              )}

              {ocrErrorMessage ? (
                <View style={[styles.ocrStatus, { backgroundColor: colors.warning + "12" }]}>
                  <Feather name="alert-circle" size={14} color={colors.warning} />
                  <Text style={[styles.ocrStatusText, { color: colors.warning }]}>{ocrErrorMessage}</Text>
                </View>
              ) : ocrRawText ? (
                <View style={[styles.ocrStatus, { backgroundColor: colors.success + "12" }]}>
                  <Feather name="check-circle" size={14} color={colors.success} />
                  <Text style={[styles.ocrStatusText, { color: colors.success }]}>
                    {fieldsDetected.length} of {totalFields} fields detected
                  </Text>
                </View>
              ) : (
                <View style={[styles.ocrStatus, { backgroundColor: colors.surfaceElevated }]}>
                  <Feather name="info" size={14} color={colors.textTertiary} />
                  <Text style={[styles.ocrStatusText, { color: colors.textTertiary }]}>
                    No text detected — enter details manually
                  </Text>
                </View>
              )}

              <ReviewField
                label="Holder Name *"
                value={holderName}
                onChangeText={setHolderName}
                detected={fieldsDetected.includes("holderName")}
                placeholder="Enter name as on document"
                colors={colors}
                autoCapitalize="words"
              />

              <ReviewField
                label="Document Number *"
                value={documentNumber}
                onChangeText={setDocumentNumber}
                detected={fieldsDetected.includes("documentNumber")}
                placeholder="Enter document number"
                colors={colors}
                autoCapitalize="characters"
              />

              {selectedType === "aadhaar" && (
                <>
                  <ReviewField
                    label="Date of Birth"
                    value={metadata.dateOfBirth ?? ""}
                    onChangeText={(v) => updateMeta("dateOfBirth", v)}
                    detected={fieldsDetected.includes("dateOfBirth")}
                    placeholder="DD/MM/YYYY"
                    colors={colors}
                  />
                  <ReviewField
                    label="Gender"
                    value={metadata.gender ?? ""}
                    onChangeText={(v) => updateMeta("gender", v)}
                    detected={fieldsDetected.includes("gender")}
                    placeholder="MALE / FEMALE"
                    colors={colors}
                    autoCapitalize="characters"
                  />
                  <ReviewField
                    label="Address"
                    value={metadata.address ?? ""}
                    onChangeText={(v) => updateMeta("address", v)}
                    detected={fieldsDetected.includes("address")}
                    placeholder="Enter address"
                    colors={colors}
                    multiline
                  />
                </>
              )}

              {selectedType === "pan" && (
                <>
                  <ReviewField
                    label="Father's Name"
                    value={metadata.fatherName ?? ""}
                    onChangeText={(v) => updateMeta("fatherName", v)}
                    detected={fieldsDetected.includes("fatherName")}
                    placeholder="Father's name"
                    colors={colors}
                    autoCapitalize="words"
                  />
                  <ReviewField
                    label="Date of Birth"
                    value={metadata.dateOfBirth ?? ""}
                    onChangeText={(v) => updateMeta("dateOfBirth", v)}
                    detected={fieldsDetected.includes("dateOfBirth")}
                    placeholder="DD/MM/YYYY"
                    colors={colors}
                  />
                </>
              )}

              {selectedType === "driving_license" && (
                <>
                  <ReviewField
                    label="Valid From"
                    value={metadata.issueDate ?? ""}
                    onChangeText={(v) => updateMeta("issueDate", v)}
                    detected={fieldsDetected.includes("issueDate")}
                    placeholder="DD/MM/YYYY"
                    colors={colors}
                  />
                  <ReviewField
                    label="Valid Until"
                    value={metadata.expiryDate ?? ""}
                    onChangeText={(v) => updateMeta("expiryDate", v)}
                    detected={fieldsDetected.includes("expiryDate")}
                    placeholder="DD/MM/YYYY"
                    colors={colors}
                  />
                  <ReviewField
                    label="Vehicle Class"
                    value={metadata.vehicleClass ?? ""}
                    onChangeText={(v) => updateMeta("vehicleClass", v)}
                    detected={fieldsDetected.includes("vehicleClass")}
                    placeholder="e.g. LMV, MCWG"
                    colors={colors}
                  />
                </>
              )}

              {selectedType === "passport" && (
                <>
                  <ReviewField
                    label="Date of Birth"
                    value={metadata.dateOfBirth ?? ""}
                    onChangeText={(v) => updateMeta("dateOfBirth", v)}
                    detected={fieldsDetected.includes("dateOfBirth")}
                    placeholder="DD/MM/YYYY"
                    colors={colors}
                  />
                  <ReviewField
                    label="Nationality"
                    value={metadata.nationality ?? ""}
                    onChangeText={(v) => updateMeta("nationality", v)}
                    detected={fieldsDetected.includes("nationality")}
                    placeholder="e.g. INDIAN"
                    colors={colors}
                    autoCapitalize="characters"
                  />
                  <ReviewField
                    label="Expiry Date"
                    value={metadata.expiryDate ?? ""}
                    onChangeText={(v) => updateMeta("expiryDate", v)}
                    detected={fieldsDetected.includes("expiryDate")}
                    placeholder="DD/MM/YYYY"
                    colors={colors}
                  />
                </>
              )}

              {selectedType === "vehicle_rc" && (
                <>
                  <ReviewField
                    label="Vehicle Model"
                    value={metadata.vehicleModel ?? ""}
                    onChangeText={(v) => updateMeta("vehicleModel", v)}
                    detected={fieldsDetected.includes("vehicleModel")}
                    placeholder="e.g. Maruti Swift"
                    colors={colors}
                  />
                  <ReviewField
                    label="Fuel Type"
                    value={metadata.fuelType ?? ""}
                    onChangeText={(v) => updateMeta("fuelType", v)}
                    detected={fieldsDetected.includes("fuelType")}
                    placeholder="PETROL / DIESEL / CNG"
                    colors={colors}
                    autoCapitalize="characters"
                  />
                  <ReviewField
                    label="Chassis Number"
                    value={metadata.chassisNumber ?? ""}
                    onChangeText={(v) => updateMeta("chassisNumber", v)}
                    detected={fieldsDetected.includes("chassisNumber")}
                    placeholder="Chassis number"
                    colors={colors}
                    autoCapitalize="characters"
                  />
                  <ReviewField
                    label="Engine Number"
                    value={metadata.engineNumber ?? ""}
                    onChangeText={(v) => updateMeta("engineNumber", v)}
                    detected={fieldsDetected.includes("engineNumber")}
                    placeholder="Engine number"
                    colors={colors}
                    autoCapitalize="characters"
                  />
                </>
              )}

              {selectedType === "membership" && (
                <>
                  <ReviewField
                    label="Organization"
                    value={metadata.organization ?? ""}
                    onChangeText={(v) => updateMeta("organization", v)}
                    detected={fieldsDetected.includes("organization")}
                    placeholder="Organization name"
                    colors={colors}
                  />
                  <ReviewField
                    label="Expiry Date"
                    value={metadata.expiryDate ?? ""}
                    onChangeText={(v) => updateMeta("expiryDate", v)}
                    detected={fieldsDetected.includes("expiryDate")}
                    placeholder="DD/MM/YYYY"
                    colors={colors}
                  />
                </>
              )}

              {selectedType === "college_id" && (
                <>
                  <ReviewField
                    label="Organization"
                    value={metadata.organization ?? ""}
                    onChangeText={(v) => updateMeta("organization", v)}
                    detected={fieldsDetected.includes("organization")}
                    placeholder="College / University name"
                    colors={colors}
                  />
                  <ReviewField
                    label="Expiry Date"
                    value={metadata.expiryDate ?? ""}
                    onChangeText={(v) => updateMeta("expiryDate", v)}
                    detected={fieldsDetected.includes("expiryDate")}
                    placeholder="DD/MM/YYYY"
                    colors={colors}
                  />
                </>
              )}

              <View style={styles.reviewActions}>
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSave}
                  activeOpacity={0.8}
                >
                  <Feather name="shield" size={16} color={colors.primaryForeground} />
                  <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>
                    Save Securely
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                  <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>

      <Modal
        visible={showTypePicker}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setShowTypePicker(false)}
      >
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShowTypePicker(false)} />
          <View style={[styles.pickerSheet, { paddingBottom: insets.bottom + spacing.base }]}>
            <View style={styles.handle} />
            <Text style={[styles.pickerTitle, { color: colors.text }]}>Choose Document Type</Text>
            {DOC_CATEGORIES.map((cat) => {
              const isSelected = selectedType === cat.type;
              const isAdded = existingTypes.includes(cat.type);
              return (
                <TouchableOpacity
                  key={cat.type}
                  style={[
                    styles.pickerItem,
                    { borderBottomColor: colors.border },
                    isSelected && { backgroundColor: colors.primary + "08" },
                  ]}
                  onPress={() => {
                    if (isAdded) {
                      Alert.alert("Already Added", `You already have a ${cat.label}. Only one per type is allowed.`);
                      return;
                    }
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedType(cat.type);
                    setShowTypePicker(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.pickerItemIcon, { backgroundColor: cat.color + "15" }]}>
                    <Feather name={cat.icon} size={16} color={cat.color} />
                  </View>
                  <Text style={[styles.pickerItemLabel, { color: colors.text }]}>{cat.label}</Text>
                  {isAdded && (
                    <Feather name="check-circle" size={16} color={colors.success} style={{ marginRight: spacing.sm }} />
                  )}
                  {isSelected && <Feather name="check" size={16} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

function ReviewField({
  label,
  value,
  onChangeText,
  detected,
  placeholder,
  colors,
  autoCapitalize,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  detected: boolean;
  placeholder: string;
  colors: ReturnType<typeof useColors>;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  multiline?: boolean;
}) {
  return (
    <View style={reviewStyles.fieldContainer}>
      <View style={reviewStyles.labelRow}>
        {detected ? (
          <Feather name="check-circle" size={12} color={colors.success} />
        ) : (
          <Feather name="alert-circle" size={12} color={colors.warning} />
        )}
        <Text style={[reviewStyles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
      </View>
      <TextInput
        style={[
          reviewStyles.textInput,
          {
            backgroundColor: colors.surfaceElevated,
            borderColor: detected ? colors.success + "40" : colors.border,
            color: colors.text,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={detected ? "" : placeholder}
        placeholderTextColor={colors.textTertiary}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
      />
    </View>
  );
}

const reviewStyles = StyleSheet.create({
  fieldContainer: {
    marginTop: spacing.sm,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  textInput: {
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    fontSize: 15,
  },
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    maxHeight: "90%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E0E0E0",
    alignSelf: "center",
    marginBottom: spacing.base,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  sheetSubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.base,
  },
  dropdownText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.base,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  actionSub: {
    fontSize: 12,
    marginTop: 2,
  },
  processingContainer: {
    alignItems: "center",
    paddingVertical: spacing["3xl"],
    gap: spacing.md,
  },
  processingTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  processingSub: {
    fontSize: 13,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.base,
  },
  backBtn: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  selectedTypeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: 10,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  bannerText: {
    fontSize: 13,
    fontWeight: "600",
  },
  ocrStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: 10,
    borderRadius: radius.sm,
    marginBottom: spacing.base,
  },
  ocrStatusText: {
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  reviewActions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: 14,
    borderRadius: radius.lg,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  cancelBtn: {
    paddingVertical: 10,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  pickerSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    maxHeight: "70%",
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: spacing.base,
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerItemIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  pickerItemLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  qualityFailContainer: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.base,
    borderRadius: radius.lg,
    gap: spacing.md,
  },
  qualityFailTitle: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  qualityFailMessage: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  retryBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
  },
  retryBtnText: {
    fontSize: 15,
    fontWeight: "700",
  },
  manualEntryBtn: {
    paddingVertical: 8,
  },
  manualEntryBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
