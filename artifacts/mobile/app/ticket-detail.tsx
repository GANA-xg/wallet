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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import QRSection from "@/components/QRSection";
import TicketCountdown from "@/components/TicketCountdown";
import TicketTimeline from "@/components/TicketTimeline";
import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";
import { getStatusColor, getTransportStyle } from "@/services/ticket/ticketService";

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
    ? ticket.ticketStatus.charAt(0).toUpperCase() + ticket.ticketStatus.slice(1)
    : "Confirmed";

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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Ticket Details</Text>
        <TouchableOpacity onPress={handleRemove}>
          <Feather name="trash-2" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>

      {/* Premium Pass Card */}
      <LinearGradient colors={style.gradient} style={styles.passCard}>
        <View style={styles.passCardGlow} />

        {/* Header */}
        <View style={styles.passHeader}>
          <View style={styles.passTransportRow}>
            <View style={[styles.passIconWrap, { backgroundColor: style.color + "30" }]}>
              <Feather name={style.icon as any} size={22} color={style.color} />
            </View>
            <View>
              <Text style={styles.passType}>{ticket.transportType?.toUpperCase() ?? ticket.type.toUpperCase()}</Text>
              {(ticket.trainNumber || ticket.trainName) && (
                <Text style={styles.passTrain}>
                  {ticket.trainNumber ?? ""}{ticket.trainNumber && ticket.trainName ? " • " : ""}{ticket.trainName ?? ""}
                </Text>
              )}
            </View>
          </View>
          <View style={[styles.passStatusBadge, { backgroundColor: statusColor + "25", borderColor: statusColor + "50" }]}>
            <Text style={[styles.passStatusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        {/* Route */}
        <View style={styles.passRouteRow}>
          <Text style={styles.passStation}>{ticket.from}</Text>
          <View style={styles.passRouteLine}>
            <View style={[styles.passRouteDot, { backgroundColor: style.color }]} />
            <View style={styles.passRouteDash} />
            <Feather name="arrow-right" size={14} color={style.color} />
            <View style={styles.passRouteDash} />
            <View style={[styles.passRouteDot, { backgroundColor: style.color }]} />
          </View>
          <Text style={styles.passStation}>{ticket.to}</Text>
        </View>

        {/* Passenger */}
        {ticket.passengerName && (
          <Text style={styles.passPassenger}>{ticket.passengerName}</Text>
        )}

        {/* Divider */}
        <View style={styles.passDivider}>
          <View style={styles.passCircle} />
          <View style={styles.passDividerLine} />
          <View style={styles.passCircle} />
        </View>

        {/* Countdown */}
        {ticket.date && <TicketCountdown date={ticket.date} time={ticket.time} />}

        {/* Divider */}
        <View style={styles.passDivider}>
          <View style={styles.passCircle} />
          <View style={styles.passDividerLine} />
          <View style={styles.passCircle} />
        </View>

        {/* Details Grid */}
        <View style={styles.passGrid}>
          {ticket.pnr && (
            <View style={styles.passGridItem}>
              <Text style={styles.passGridLabel}>PNR</Text>
              <Text style={styles.passGridValue}>{ticket.pnr}</Text>
            </View>
          )}
          {ticket.coach && (
            <View style={styles.passGridItem}>
              <Text style={styles.passGridLabel}>COACH</Text>
              <Text style={styles.passGridValue}>{ticket.coach}</Text>
            </View>
          )}
          {ticket.seat && (
            <View style={styles.passGridItem}>
              <Text style={styles.passGridLabel}>SEAT</Text>
              <Text style={styles.passGridValue}>{ticket.seat}</Text>
            </View>
          )}
          <View style={styles.passGridItem}>
            <Text style={styles.passGridLabel}>DATE</Text>
            <Text style={styles.passGridValue}>{ticket.date}</Text>
          </View>
          {ticket.time && (
            <View style={styles.passGridItem}>
              <Text style={styles.passGridLabel}>TIME</Text>
              <Text style={styles.passGridValue}>{ticket.time}</Text>
            </View>
          )}
        </View>

        {/* QR Code */}
        <View style={styles.passQRWrap}>
          <QRSection value={ticket.qrCode ?? ticket.pnr ?? ticket.id} />
        </View>
      </LinearGradient>

      {/* Timeline */}
      {(ticket.stations || (ticket.from && ticket.to)) && (
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TicketTimeline
            from={ticket.from}
            to={ticket.to}
            stations={ticket.stations}
          />
        </View>
      )}

      {/* Actions */}
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
    marginBottom: 16,
  },
  passTransportRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  passIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  passType: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
  },
  passTrain: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
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
  passRouteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  passStation: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
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
  passPassenger: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  passDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 14,
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
    color: "#fff",
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
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
