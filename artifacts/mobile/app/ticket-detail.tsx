import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import RnAnimated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import QRSection from "@/components/QRSection";
import TicketCountdown from "@/components/TicketCountdown";
import TicketTimeline from "@/components/TicketTimeline";
import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";
import { getStatusColor, getTransportStyle } from "@/services/ticket/ticketService";

const NA = "Not Available";

function DetailRow({ icon, label, value }: { icon: string; label: string; value?: string }) {
  return (
    <View style={detailStyles.row}>
      <Feather name={icon as any} size={14} color="rgba(255,255,255,0.35)" />
      <Text style={detailStyles.label}>{label}</Text>
      <Text style={detailStyles.value}>{value ?? NA}</Text>
    </View>
  );
}

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={detailStyles.sectionHeader}>
      <Feather name={icon as any} size={14} color="rgba(255,255,255,0.5)" />
      <Text style={detailStyles.sectionTitle}>{title}</Text>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 7,
  },
  label: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    fontWeight: "600",
    width: 90,
  },
  value: {
    color: "#FFFDF9",
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
    textAlign: "right",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    marginBottom: 8,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  sectionTitle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
});

export default function TicketDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tickets, removeTicket } = useWallet();

  const ticket = tickets.find((t) => t.id === id);

  if (!ticket) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.notFound}>
          <Feather name="alert-circle" size={40} color={colors.error} />
          <Text style={[styles.notFoundText, { color: colors.text }]}>Ticket not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.backLink, { color: colors.primary }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const style = getTransportStyle(ticket.transportType ?? ticket.type);
  const statusColor = getStatusColor(ticket.ticketStatus);
  const statusLabel = ticket.ticketStatus
    ? ticket.ticketStatus.toUpperCase()
    : "CONFIRMED";

  const handleRemove = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Remove Ticket",
      "Are you sure you want to remove this ticket?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            removeTicket(ticket.id);
            router.back();
          },
        },
      ],
    );
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const passengerDetails = [
    ticket.passengerName,
    ticket.passengerAge ? `${ticket.passengerAge} yrs` : null,
    ticket.passengerGender,
  ].filter(Boolean).join("  ·  ");

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <RnAnimated.View entering={FadeInDown.duration(500).delay(0)}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Ticket Details</Text>
          <TouchableOpacity onPress={handleRemove}>
            <Feather name="trash-2" size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      </RnAnimated.View>

      {/* Main Pass Card */}
      <RnAnimated.View entering={FadeInDown.duration(500).delay(100)}>
        <LinearGradient colors={style.gradient} style={styles.passCard}>
          <View style={styles.passCardGlow} />

          {/* Card Header */}
          <View style={styles.passHeader}>
            <View style={styles.passTransportRow}>
              <View style={[styles.passIconWrap, { backgroundColor: style.color + "30" }]}>
                <Feather name={style.icon as any} size={22} color={style.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.passType}>{ticket.transportType?.toUpperCase() ?? "TRAIN"}</Text>
                {ticket.trainName && (
                  <Text style={styles.passTrainName}>{ticket.trainName}</Text>
                )}
                {ticket.trainNumber && (
                  <Text style={styles.passTrainNumber}>#{ticket.trainNumber}</Text>
                )}
              </View>
            </View>
            <View style={[styles.passStatusBadge, { backgroundColor: statusColor + "25", borderColor: statusColor + "50" }]}>
              <Text style={[styles.passStatusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>

          {/* PNR */}
          {ticket.pnr && (
            <View style={styles.pnrRow}>
              <Text style={styles.pnrLabel}>PNR</Text>
              <Text style={styles.pnrValue}>{ticket.pnr}</Text>
            </View>
          )}

          {/* Route */}
          <View style={styles.passRouteRow}>
            <View style={styles.passStationBlock}>
              <Text style={styles.passStationCode}>{ticket.from ?? NA}</Text>
              {ticket.time && <Text style={styles.passTimeLabel}>{ticket.time}</Text>}
            </View>
            <View style={styles.passRouteLine}>
              <View style={[styles.passRouteDot, { backgroundColor: style.color }]} />
              <View style={styles.passRouteDash} />
              <Feather name="chevrons-right" size={14} color={style.color} />
              <View style={styles.passRouteDash} />
              <View style={[styles.passRouteDot, { backgroundColor: style.color }]} />
            </View>
            <View style={styles.passStationBlock}>
              <Text style={styles.passStationCode}>{ticket.to ?? NA}</Text>
              {ticket.arrivalTime && <Text style={styles.passTimeLabel}>{ticket.arrivalTime}</Text>}
            </View>
          </View>

          {/* Duration */}
          {ticket.duration && (
            <View style={styles.durationRow}>
              <Feather name="clock" size={12} color="rgba(255,255,255,0.5)" />
              <Text style={styles.durationText}>{ticket.duration}</Text>
              {ticket.distance && (
                <>
                  <Text style={styles.durationSep}>·</Text>
                  <Text style={styles.durationText}>{ticket.distance}</Text>
                </>
              )}
              {ticket.delay && ticket.delay !== "0 min" && (
                <>
                  <Text style={styles.durationSep}>·</Text>
                  <Text style={[styles.durationText, { color: "#EF4444" }]}>+{ticket.delay}</Text>
                </>
              )}
            </View>
          )}

          {/* Passenger */}
          {passengerDetails ? (
            <View style={styles.passPassengerRow}>
              <Feather name="user" size={12} color="rgba(255,255,255,0.6)" />
              <Text style={styles.passPassenger}>{passengerDetails}</Text>
            </View>
          ) : null}

          {/* Divider */}
          <View style={styles.passDivider}>
            <View style={[styles.passCircle, { backgroundColor: colors.background }]} />
            <View style={styles.passDividerLine} />
            <View style={[styles.passCircle, { backgroundColor: colors.background }]} />
          </View>

          {/* Countdown */}
          {ticket.date && <TicketCountdown date={ticket.date} time={ticket.time} />}

          {/* Divider */}
          <View style={styles.passDivider}>
            <View style={[styles.passCircle, { backgroundColor: colors.background }]} />
            <View style={styles.passDividerLine} />
            <View style={[styles.passCircle, { backgroundColor: colors.background }]} />
          </View>

          {/* Details Grid */}
          <View style={styles.passGrid}>
            {[
              { label: "DATE", value: ticket.date },
              { label: "CLASS", value: ticket.ticketClass },
              { label: "COACH", value: ticket.coach },
              { label: "SEAT", value: ticket.seat },
              { label: "BERTH", value: ticket.berthType },
              { label: "PLATFORM", value: ticket.platform },
            ].filter((item) => item.value).map((item) => (
              <View key={item.label} style={styles.passGridItem}>
                <Text style={styles.passGridLabel}>{item.label}</Text>
                <Text style={[styles.passGridValue, { color: colors.text }]}>{item.value}</Text>
              </View>
            ))}
          </View>

          {/* QR Code */}
          <View style={styles.passQRWrap}>
            <QRSection value={ticket.pnr ?? ticket.qrCode ?? ticket.id} label="SCAN AT PLATFORM" />
          </View>
        </LinearGradient>
      </RnAnimated.View>

      {/* Journey Details Section */}
      <RnAnimated.View entering={FadeInDown.duration(500).delay(200)}>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionHeader icon="map" title="Journey Details" />
          <DetailRow icon="calendar" label="Date" value={ticket.date} />
          <DetailRow icon="map-pin" label="Boarding" value={ticket.from} />
          <DetailRow icon="map-pin" label="Destination" value={ticket.to} />
          <DetailRow icon="clock" label="Departure" value={ticket.time} />
          <DetailRow icon="clock" label="Arrival" value={ticket.arrivalTime} />
          <DetailRow icon="clock" label="Duration" value={ticket.duration} />
          <DetailRow icon="navigation" label="Distance" value={ticket.distance} />
          <DetailRow icon="hash" label="Train No." value={ticket.trainNumber} />
          <DetailRow icon="type" label="Train" value={ticket.trainName} />
        </View>
      </RnAnimated.View>

      {/* Passenger Details Section */}
      <RnAnimated.View entering={FadeInDown.duration(500).delay(250)}>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionHeader icon="user" title="Passenger Details" />
          <DetailRow icon="user" label="Name" value={ticket.passengerName} />
          <DetailRow icon="hash" label="Age" value={ticket.passengerAge ? `${ticket.passengerAge}` : undefined} />
          <DetailRow icon="users" label="Gender" value={ticket.passengerGender} />
          <DetailRow icon="layers" label="Coach" value={ticket.coach} />
          <DetailRow icon="hash" label="Seat" value={ticket.seat} />
          <DetailRow icon="arrow-up" label="Berth" value={ticket.berthType} />
          <DetailRow icon="tag" label="Class" value={ticket.ticketClass} />
        </View>
      </RnAnimated.View>

      {/* Booking Status Section */}
      <RnAnimated.View entering={FadeInDown.duration(500).delay(300)}>
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionHeader icon="check-circle" title="Booking Status" />
          <DetailRow icon="check-circle" label="Booking" value={ticket.bookingStatus} />
          <DetailRow icon="info" label="Current" value={ticket.currentStatus} />
          <DetailRow icon="activity" label="Train" value={ticket.trainStatus} />
          <DetailRow icon="wifi" label="Running" value={ticket.runningStatus} />
          <DetailRow icon="alert-triangle" label="Delay" value={ticket.delay} />
          <DetailRow icon="hash" label="Platform" value={ticket.platform} />
          <DetailRow icon="arrow-up-right" label="Exp. Arrival" value={ticket.expectedArrival} />
          <DetailRow icon="arrow-down-right" label="Exp. Depart" value={ticket.expectedDeparture} />
        </View>
      </RnAnimated.View>

      {/* Route Timeline */}
      {(ticket.stations || (ticket.from && ticket.to)) && (
        <RnAnimated.View entering={FadeInDown.duration(500).delay(350)}>
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TicketTimeline
              from={ticket.from}
              to={ticket.to}
              stations={ticket.stations}
              stationTimes={ticket.stationTimes}
            />
          </View>
        </RnAnimated.View>
      )}

      {/* Actions */}
      <RnAnimated.View entering={FadeInDown.duration(500).delay(400)}>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            activeOpacity={0.8}
          >
            <Feather name="arrow-left" size={16} color="#fff" />
            <Text style={styles.actionBtnText}>Back to Tickets</Text>
          </TouchableOpacity>
        </View>
      </RnAnimated.View>
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
    marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: "800" },
  notFound: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  notFoundText: { fontSize: 16, fontWeight: "600" },
  backLink: { fontSize: 15, fontWeight: "700" },

  passCard: {
    borderRadius: 28,
    padding: 24,
    overflow: "hidden",
    position: "relative",
  },
  passCardGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 28,
  },
  passHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  passTransportRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  passIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  passType: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
  },
  passTrainName: {
    color: "#FFFDF9",
    fontSize: 15,
    fontWeight: "800",
    marginTop: 2,
  },
  passTrainNumber: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1,
  },
  passStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  passStatusText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  pnrRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pnrLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  pnrValue: {
    color: "#FFFDF9",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 2,
  },
  passRouteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  passStationBlock: {
    alignItems: "center",
    minWidth: 80,
  },
  passStationCode: {
    color: "#FFFDF9",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  passTimeLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  passRouteLine: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  passRouteDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  passRouteDash: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.2)",
  },
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 8,
  },
  durationText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    fontWeight: "600",
  },
  durationSep: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 12,
  },
  passPassengerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  passPassenger: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontWeight: "600",
  },
  passDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
    overflow: "visible",
  },
  passCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#0F1115",
  },
  passDividerLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.15)",
  },
  passGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 4,
  },
  passGridItem: {
    width: "40%",
  },
  passGridLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  passGridValue: {
    color: "#FFFDF9",
    fontSize: 15,
    fontWeight: "700",
  },
  passQRWrap: {
    alignItems: "center",
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },

  section: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 16,
  },
  actions: {
    marginTop: 20,
    gap: 12,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  actionBtnText: {
    color: "#FFFDF9",
    fontSize: 16,
    fontWeight: "700",
  },
});
