import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import RnAnimated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";
import { createSmartTicket } from "@/services/ticket/ticketService";
import { addTicketFromExternal, type ExternalSource } from "@/services/ticket/externalImportService";
import { lookupPNR, parseText, validatePNRFormat } from "@/services/ticket/pnrService";
import type { SmartTicketInput, Ticket } from "@/types";

type TicketStatus = "idle" | "loading" | "invalid" | "duplicate" | "failed" | "success";

interface TransportOption {
  type: SmartTicketInput["transportType"];
  icon: keyof typeof Feather.glyphMap;
  label: string;
  color: string;
  gradient: [string, string];
}

const TRANSPORT_OPTIONS: TransportOption[] = [
  { type: "train", icon: "truck", label: "Train", color: "#2E7D32", gradient: ["#0f3320", "#1a5c35"] },
  { type: "flight", icon: "navigation", label: "Flight", color: "#AE431E", gradient: ["#0f2040", "#1e3a5f"] },
  { type: "bus", icon: "map", label: "Bus", color: "#EAC891", gradient: ["#3d2700", "#5f3e0f"] },
  { type: "metro", icon: "crosshair", label: "Metro", color: "#8B5CF6", gradient: ["#200f40", "#3b1f5f"] },
  { type: "ferry", icon: "anchor", label: "Ferry", color: "#06B6D4", gradient: ["#0f2f3f", "#1a4f5f"] },
];

export default function AddTicketScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addTicket, findTicketByPNR } = useWallet();
  const params = useLocalSearchParams<{ type?: string; pnr?: string; source?: string }>();

  const [step, setStep] = useState<"select" | "input" | "result">("select");
  const [selectedTransport, setSelectedTransport] = useState<TransportOption | null>(null);
  const [inputMode, setInputMode] = useState<"manual" | "upload" | "paste">("manual");
  const [pnrInput, setPnrInput] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [status, setStatus] = useState<TicketStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedTicket, setGeneratedTicket] = useState<Ticket | null>(null);
  const [existingTicket, setExistingTicket] = useState<Ticket | null>(null);
  const loadingMessageRef = useRef("");

  useEffect(() => {
    if (params.type && params.pnr) {
      const transport = TRANSPORT_OPTIONS.find((t) => t.type === params.type);
      if (transport) {
        setSelectedTransport(transport);
        setPnrInput(params.pnr);
        setStep("input");
        handleAutoImport(params.type as ExternalSource, params.pnr, params.source);
      }
    }
  }, [params.type, params.pnr, params.source]);

  const setLoading = (msg: string) => {
    setIsLoading(true);
    setStatus("loading");
    loadingMessageRef.current = msg;
    setStatusMessage(msg);
  };

  const endLoading = () => {
    setIsLoading(false);
  };

  const handleAutoImport = async (type: string, pnr: string, source?: string) => {
    const formatError = validatePNRFormat(pnr);
    if (formatError) {
      setStatus("invalid");
      setStatusMessage(formatError);
      return;
    }

    const existing = findTicketByPNR(pnr);
    if (existing) {
      setStatus("duplicate");
      setExistingTicket(existing);
      setStatusMessage("Ticket already exists in Wallet");
      return;
    }

    setLoading("Importing ticket...");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    await new Promise((r) => setTimeout(r, 1000));

    const extSource = (source ?? "irctc") as ExternalSource;
    const result = addTicketFromExternal(extSource, {
      source: extSource,
      pnr,
    });

    if (result.success && result.ticket) {
      const fullInput: SmartTicketInput = {
        ...result.ticket,
        transportType: type as SmartTicketInput["transportType"],
        type: type as SmartTicketInput["type"],
        pnr,
      } as SmartTicketInput;

      const ticket = createSmartTicket(fullInput);
      setGeneratedTicket(ticket);
      setStatus("success");
      setStep("result");
      setStatusMessage("Ticket ready to save");
    } else {
      setStatus("failed");
      setStatusMessage("Ticket details could not be verified.");
    }
    endLoading();
  };

  const handleSelectTransport = (option: TransportOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTransport(option);
    setStatus("idle");
    setStatusMessage("");
    setPnrInput("");
    setPastedText("");
    setExistingTicket(null);
    setGeneratedTicket(null);
    setStep("input");
  };

  const handleManualPNR = async () => {
    if (isLoading) return;

    const formatError = validatePNRFormat(pnrInput);
    if (formatError) {
      setStatus("invalid");
      setStatusMessage(formatError);
      return;
    }

    const existing = findTicketByPNR(pnrInput.trim());
    if (existing) {
      setStatus("duplicate");
      setExistingTicket(existing);
      setStatusMessage("Ticket already exists in Wallet");
      return;
    }

    setLoading("Fetching Ticket...");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await lookupPNR(pnrInput.trim());

    if (result.success && result.data) {
      const d = result.data;
      const ticketTitle =
        d.title ??
        (d.trainName && d.trainNumber
          ? `${d.trainName} (${d.trainNumber})`
          : d.pnr
            ? `PNR ${d.pnr}`
            : undefined);

      const fullInput: SmartTicketInput = {
        transportType: selectedTransport!.type,
        type: selectedTransport!.type as SmartTicketInput["type"],
        pnr: d.pnr,
        trainNumber: d.trainNumber,
        trainName: d.trainName,
        from: d.from,
        to: d.to,
        date: d.date ?? new Date().toISOString().split("T")[0],
        time: d.time,
        coach: d.coach,
        seat: d.seat,
        passengerName: d.passengerName,
        ticketStatus: d.ticketStatus,
        stations: d.stations,
        title: ticketTitle,
        arrivalTime: d.arrivalTime,
        duration: d.duration,
        distance: d.distance,
        platform: d.platform,
        passengerAge: d.passengerAge,
        passengerGender: d.passengerGender,
        berthType: d.berthType,
        ticketClass: d.ticketClass,
        bookingStatus: d.bookingStatus,
        currentStatus: d.currentStatus,
        trainStatus: d.trainStatus,
        runningStatus: d.runningStatus,
        delay: d.delay,
        expectedArrival: d.expectedArrival,
        expectedDeparture: d.expectedDeparture,
        stationTimes: d.stationTimes,
      };

      const ticket = createSmartTicket(fullInput);
      setGeneratedTicket(ticket);
      setStatus("success");
      setStep("result");
      setStatusMessage("Ticket ready to save");
    } else {
      setStatus("failed");
      setStatusMessage("Ticket details could not be verified.");
    }
    endLoading();
  };

  const handlePasteDetails = () => {
    if (isLoading) return;

    if (!pastedText.trim()) {
      setStatus("invalid");
      setStatusMessage("Please paste booking details.");
      return;
    }

    setLoading("Parsing booking details...");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = parseText(pastedText);

    if (result.success && result.data) {
      const existing = result.data.pnr ? findTicketByPNR(result.data.pnr) : undefined;
      if (existing) {
        setStatus("duplicate");
        setExistingTicket(existing);
        setStatusMessage("Ticket already exists in Wallet");
        endLoading();
        return;
      }
      const fullInput: SmartTicketInput = {
        transportType: selectedTransport!.type,
        type: selectedTransport!.type as SmartTicketInput["type"],
        ...result.data,
      } as SmartTicketInput;

      const ticket = createSmartTicket(fullInput);
      setGeneratedTicket(ticket);
      setStatus("success");
      setStep("result");
      setStatusMessage("Ticket ready to save");
    } else {
      setStatus("failed");
      setStatusMessage("Ticket details could not be verified.");
    }
    endLoading();
  };

  const handleUploadImage = async () => {
    if (isLoading) return;

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setStatus("failed");
        setStatusMessage("Camera roll permission is required to upload images.");
        return;
      }

      const pickResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!pickResult.canceled && pickResult.assets[0]) {
        setStatus("failed");
        setStatusMessage("Could not extract ticket details from image. Try entering PNR manually.");
      }
    } catch {
      setStatus("failed");
      setStatusMessage("Failed to process image. Please try again.");
    }
  };

  const handleSaveTicket = () => {
    if (!generatedTicket) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addTicket(generatedTicket);
    setStatus("success");
    setStatusMessage("Ticket saved to Wallet!");
    router.replace("/tickets");
  };

  const handleOpenExisting = () => {
    if (!existingTicket) return;
    router.push(`/ticket-detail?id=${existingTicket.id}` as never);
  };

  const handleRetry = () => {
    setStatus("idle");
    setStatusMessage("");
    setExistingTicket(null);
    setGeneratedTicket(null);
  };

  const handleCancel = () => {
    setStatus("idle");
    setStatusMessage("");
    setExistingTicket(null);
    setGeneratedTicket(null);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const isButtonDisabled = isLoading;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <RnAnimated.View entering={FadeInDown.duration(500).delay(0)}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Add Ticket</Text>
          <View style={{ width: 22 }} />
        </View>
      </RnAnimated.View>

      {step === "select" && (
        <RnAnimated.View entering={FadeInDown.duration(500).delay(100)}>
          <View style={styles.transportGrid}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Select Transport Type</Text>
            {TRANSPORT_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.type}
                onPress={() => handleSelectTransport(option)}
                activeOpacity={0.85}
              >
                <LinearGradient colors={option.gradient} style={styles.transportCard}>
                  <View style={[styles.transportIconWrap, { backgroundColor: option.color + "30" }]}>
                    <Feather name={option.icon} size={28} color={option.color} />
                  </View>
                  <Text style={[styles.transportLabel, { color: colors.text }]}>{option.label}</Text>
                  <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.3)" />
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </RnAnimated.View>
      )}

      {step === "input" && selectedTransport && (
        <RnAnimated.View entering={FadeInDown.duration(500).delay(100)}>
          <View style={styles.inputSection}>
          <View style={styles.selectedTransportRow}>
            <Feather name={selectedTransport.icon} size={16} color={selectedTransport.color} />
            <Text style={[styles.selectedTransportText, { color: selectedTransport.color }]}>
              {selectedTransport.label}
            </Text>
            <TouchableOpacity onPress={() => { setStep("select"); setSelectedTransport(null); setStatus("idle"); }}>
              <Text style={[styles.changeLink, { color: colors.text }]}>Change</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputModes}>
            <TouchableOpacity
              style={[styles.modeBtn, inputMode === "manual" && { backgroundColor: colors.primary + "25", borderColor: colors.primary }]}
              onPress={() => { setInputMode("manual"); setStatus("idle"); }}
            >
              <Feather name="edit-3" size={16} color={inputMode === "manual" ? colors.primary : colors.textSecondary} />
              <Text style={[styles.modeText, { color: inputMode === "manual" ? colors.primary : colors.textSecondary }]}>Enter PNR</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, inputMode === "upload" && { backgroundColor: colors.primary + "25", borderColor: colors.primary }]}
              onPress={() => { setInputMode("upload"); setStatus("idle"); }}
            >
              <Feather name="image" size={16} color={inputMode === "upload" ? colors.primary : colors.textSecondary} />
              <Text style={[styles.modeText, { color: inputMode === "upload" ? colors.primary : colors.textSecondary }]}>Upload</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, inputMode === "paste" && { backgroundColor: colors.primary + "25", borderColor: colors.primary }]}
              onPress={() => { setInputMode("paste"); setStatus("idle"); }}
            >
              <Feather name="clipboard" size={16} color={inputMode === "paste" ? colors.primary : colors.textSecondary} />
              <Text style={[styles.modeText, { color: inputMode === "paste" ? colors.primary : colors.textSecondary }]}>Paste</Text>
            </TouchableOpacity>
          </View>

          {/* Status Messages */}
          {status === "invalid" && (
            <View style={[styles.statusBanner, { backgroundColor: colors.error + "20" }]}>
              <Feather name="alert-circle" size={16} color={colors.error} />
              <Text style={[styles.statusText, { color: colors.error }]}>{statusMessage}</Text>
            </View>
          )}

          {status === "duplicate" && existingTicket && (
            <View style={[styles.statusBanner, { backgroundColor: colors.warning + "20" }]}>
              <Feather name="info" size={16} color={colors.warning} />
              <Text style={[styles.statusText, { color: colors.warning }]}>{statusMessage}</Text>
            </View>
          )}

          {status === "failed" && (
            <View style={[styles.statusBanner, { backgroundColor: colors.error + "20" }]}>
              <Feather name="x-circle" size={16} color={colors.error} />
              <Text style={[styles.statusText, { color: colors.error }]}>{statusMessage}</Text>
            </View>
          )}

          {status === "loading" && (
            <View style={[styles.statusBanner, { backgroundColor: colors.primary + "15" }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.statusText, { color: colors.primary }]}>{statusMessage}</Text>
            </View>
          )}

          {/* Input modes */}
          {inputMode === "manual" && (
            <View style={[styles.inputCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>PNR Number</Text>
              <TextInput
                style={[
                  styles.textInput,
                  { color: colors.text, borderColor: colors.input, backgroundColor: colors.background },
                  status === "invalid" && { borderColor: colors.error },
                ]}
                value={pnrInput}
                onChangeText={(v) => { setPnrInput(v); setStatus("idle"); }}
                placeholder="Enter 10-digit PNR"
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
                maxLength={10}
                editable={!isLoading}
              />

              {status === "duplicate" && existingTicket ? (
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                  onPress={handleOpenExisting}
                  activeOpacity={0.8}
                >
                  <Feather name="eye" size={16} color="#fff" />
                  <Text style={styles.primaryBtnText}>Open Ticket</Text>
                </TouchableOpacity>
              ) : status === "failed" ? (
                <View style={styles.errorActions}>
                  <TouchableOpacity
                    style={[styles.secondaryBtn, { borderColor: colors.border }]}
                    onPress={handleCancel}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: colors.primary, flex: 1 }]}
                    onPress={handleManualPNR}
                    activeOpacity={0.8}
                    disabled={isButtonDisabled}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.primaryBtnText}>Retry</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    { backgroundColor: isButtonDisabled ? colors.mutedForeground : colors.primary },
                  ]}
                  onPress={handleManualPNR}
                  activeOpacity={0.8}
                  disabled={isButtonDisabled}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Feather name="search" size={16} color="#fff" />
                  )}
                  <Text style={styles.primaryBtnText}>
                    {isLoading ? statusMessage : "Get Ticket"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {inputMode === "paste" && (
            <View style={[styles.inputCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Paste Booking Details</Text>
              <TextInput
                style={[styles.textArea, { color: colors.text, borderColor: colors.input, backgroundColor: colors.background }]}
                value={pastedText}
                onChangeText={setPastedText}
                placeholder="Paste your booking confirmation text here..."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={5}
                editable={!isLoading}
              />
              {status === "duplicate" && existingTicket ? (
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                  onPress={handleOpenExisting}
                  activeOpacity={0.8}
                >
                  <Feather name="eye" size={16} color="#fff" />
                  <Text style={styles.primaryBtnText}>Open Ticket</Text>
                </TouchableOpacity>
              ) : status === "failed" ? (
                <View style={styles.errorActions}>
                  <TouchableOpacity
                    style={[styles.secondaryBtn, { borderColor: colors.border }]}
                    onPress={handleCancel}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.primaryBtn, { backgroundColor: colors.primary, flex: 1 }]}
                    onPress={handlePasteDetails}
                    activeOpacity={0.8}
                    disabled={isButtonDisabled}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.primaryBtnText}>Retry</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    { backgroundColor: isButtonDisabled ? colors.mutedForeground : colors.primary },
                  ]}
                  onPress={handlePasteDetails}
                  activeOpacity={0.8}
                  disabled={isButtonDisabled}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Feather name="search" size={16} color="#fff" />
                  )}
                  <Text style={styles.primaryBtnText}>
                    {isLoading ? statusMessage : "Parse Details"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {inputMode === "upload" && (
            <View style={[styles.inputCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.uploadArea, { borderColor: colors.border }]}
                onPress={handleUploadImage}
                activeOpacity={0.7}
                disabled={isLoading}
              >
                <Feather name="upload-cloud" size={36} color={colors.primary} />
                <Text style={[styles.uploadText, { color: colors.textSecondary }]}>
                  Tap to upload ticket image or PDF
                </Text>
                <Text style={[styles.uploadHint, { color: colors.textTertiary }]}>
                  Supports JPG, PNG, PDF
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        </RnAnimated.View>
      )}

      {step === "result" && generatedTicket && status === "success" && (
        <RnAnimated.View entering={FadeInDown.duration(500).delay(100)}>
          <View style={styles.resultSection}>
          <View style={[styles.successBanner, { backgroundColor: colors.success + "20" }]}>
            <Feather name="check-circle" size={20} color={colors.success} />
            <Text style={[styles.successText, { color: colors.success }]}>Ticket Created Successfully</Text>
          </View>

          <LinearGradient
            colors={TRANSPORT_OPTIONS.find((t) => t.type === generatedTicket.transportType)?.gradient ?? ["#0f3320", "#1a5c35"]}
            style={styles.previewCard}
          >
            <Text style={[styles.previewTitle, { color: colors.text }]}>{generatedTicket.title}</Text>
            {generatedTicket.passengerName && (
              <Text style={styles.previewPassenger}>{generatedTicket.passengerName}</Text>
            )}
            {generatedTicket.pnr && (
              <Text style={styles.previewPnr}>PNR: {generatedTicket.pnr}</Text>
            )}
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Date</Text>
              <Text style={[styles.previewValue, { color: colors.text }]}>{generatedTicket.date}</Text>
            </View>
            {generatedTicket.time && (
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Time</Text>
                <Text style={[styles.previewValue, { color: colors.text }]}>{generatedTicket.time}</Text>
              </View>
            )}
            {generatedTicket.trainName && (
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Train</Text>
                <Text style={[styles.previewValue, { color: colors.text }]}>{generatedTicket.trainName}</Text>
              </View>
            )}
            {generatedTicket.coach && (
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Coach</Text>
                <Text style={[styles.previewValue, { color: colors.text }]}>{generatedTicket.coach}</Text>
              </View>
            )}
            {generatedTicket.seat && (
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Seat</Text>
                <Text style={[styles.previewValue, { color: colors.text }]}>{generatedTicket.seat}</Text>
              </View>
            )}
          </LinearGradient>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={handleSaveTicket}
            activeOpacity={0.8}
          >
            <Feather name="save" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Save to Wallet</Text>
          </TouchableOpacity>
          </View>
        </RnAnimated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  title: { fontSize: 20, fontWeight: "800" },
  sectionTitle: { fontSize: 14, fontWeight: "600", marginBottom: 12 },
  transportGrid: {
    gap: 12,
  },
  transportCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 18,
    borderRadius: 20,
  },
  transportIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  transportLabel: {
    flex: 1,
    color: "#FFFDF9",
    fontSize: 18,
    fontWeight: "700",
  },
  inputSection: {
    gap: 16,
  },
  selectedTransportRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  selectedTransportText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  changeLink: {
    color: "#FFFDF9",
    fontSize: 13,
    fontWeight: "600",
  },
  inputModes: {
    flexDirection: "row",
    gap: 8,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },
  modeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
  },
  statusText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
  },
  inputCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  textInput: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  textArea: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: "top",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  primaryBtnText: {
    color: "#FFFDF9",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
  errorActions: {
    flexDirection: "row",
    gap: 12,
  },
  uploadArea: {
    alignItems: "center",
    padding: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    gap: 8,
  },
  uploadText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  uploadHint: {
    fontSize: 11,
  },
  resultSection: {
    gap: 16,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
  },
  successText: {
    fontSize: 14,
    fontWeight: "700",
  },
  previewCard: {
    padding: 20,
    borderRadius: 24,
    gap: 8,
  },
  previewTitle: {
    color: "#FFFDF9",
    fontSize: 20,
    fontWeight: "900",
  },
  previewPassenger: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "600",
  },
  previewPnr: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 8,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  previewLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
  },
  previewValue: {
    color: "#FFFDF9",
    fontSize: 13,
    fontWeight: "600",
  },
});
