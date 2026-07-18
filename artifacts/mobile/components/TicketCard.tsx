import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import TicketCountdown from "@/components/TicketCountdown";
import type { Ticket } from "@/types";

import { getStatusColor, getTransportStyle } from "../services/ticket/ticketService";

interface TicketCardProps {
  ticket: Ticket;
}

export default function TicketCard({ ticket }: TicketCardProps) {
  const style = getTransportStyle(ticket.transportType ?? ticket.type);
  const [revealed, setRevealed] = useState(false);
  const shakeAnim = React.useRef(new Animated.Value(0)).current;

  const isSmart = ticket.isSmartTicket;

  const handleReveal = () => {
    if (revealed) return;
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 5, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start(() => setRevealed(true));
  };

  const handlePress = () => {
    if (isSmart) {
      router.push(`/ticket-detail?id=${ticket.id}` as never);
    } else {
      handleReveal();
    }
  };

  const statusColor = getStatusColor(ticket.ticketStatus);
  const statusLabel = ticket.ticketStatus
    ? ticket.ticketStatus.charAt(0).toUpperCase() + ticket.ticketStatus.slice(1)
    : "Confirmed";

  if (isSmart) {
    return (
      <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
        <TouchableOpacity onPress={handlePress} activeOpacity={0.95}>
          <LinearGradient colors={style.gradient} style={styles.smartCard}>
            {/* Glass overlay */}
            <View style={styles.glassOverlay} />

            {/* Header */}
            <View style={styles.smartHeader}>
              <View style={styles.transportRow}>
                <View style={[styles.smartIconWrap, { backgroundColor: style.color + "30" }]}>
                  <Feather name={style.icon as any} size={18} color={style.color} />
                </View>
                <View>
                  <Text style={styles.transportLabel}>{ticket.transportType?.toUpperCase() ?? ticket.type.toUpperCase()}</Text>
                  {(ticket.trainNumber || ticket.trainName) && (
                    <Text style={styles.trainInfo}>
                      {ticket.trainNumber ?? ""}{ticket.trainNumber && ticket.trainName ? " • " : ""}{ticket.trainName ?? ""}
                    </Text>
                  )}
                </View>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + "25", borderColor: statusColor + "50" }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
              </View>
            </View>

            {/* Route */}
            <View style={styles.smartRoute}>
              <Text style={styles.smartStation}>{ticket.from}</Text>
              <View style={styles.smartRouteLine}>
                <View style={[styles.smartRouteDot, { backgroundColor: style.color }]} />
                <View style={[styles.smartRouteDash, { borderColor: style.color + "60" }]} />
                <Feather name="arrow-right" size={12} color={style.color} />
              </View>
              <Text style={styles.smartStation}>{ticket.to}</Text>
            </View>

            {/* Passenger */}
            {ticket.passengerName && (
              <Text style={styles.passengerName}>{ticket.passengerName}</Text>
            )}

            {/* Countdown */}
            {ticket.date && (
              <TicketCountdown date={ticket.date} time={ticket.time} />
            )}

            {/* Details grid */}
            <View style={styles.detailsGrid}>
              {ticket.pnr && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailSmartLabel}>PNR</Text>
                  <Text style={styles.detailSmartValue}>{revealed ? ticket.pnr : "••••••••"}</Text>
                </View>
              )}
              {ticket.coach && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailSmartLabel}>COACH</Text>
                  <Text style={styles.detailSmartValue}>{ticket.coach}</Text>
                </View>
              )}
              {ticket.seat && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailSmartLabel}>SEAT</Text>
                  <Text style={styles.detailSmartValue}>{ticket.seat}</Text>
                </View>
              )}
              {ticket.date && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailSmartLabel}>DATE</Text>
                  <Text style={styles.detailSmartValue}>{ticket.date}</Text>
                </View>
              )}
              {ticket.time && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailSmartLabel}>TIME</Text>
                  <Text style={styles.detailSmartValue}>{ticket.time}</Text>
                </View>
              )}
            </View>

            <View style={styles.cardFooter}>
              {!revealed && ticket.pnr ? (
                <TouchableOpacity onPress={handleReveal} style={styles.revealBtn}>
                  <Feather name="eye" size={12} color={style.color} />
                  <Text style={[styles.revealText, { color: style.color }]}>Tap to reveal PNR</Text>
                </TouchableOpacity>
              ) : ticket.pnr ? (
                <View style={styles.verifiedRow}>
                  <Feather name="check-circle" size={12} color="#2E7D32" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              ) : null}
              <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.3)" />
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.95}>
        <LinearGradient colors={style.gradient} style={styles.ticketCard}>
          {/* Header */}
          <View style={styles.ticketHeader}>
            <View style={[styles.ticketIconWrap, { backgroundColor: style.color + "30" }]}>
              <Feather name={style.icon as any} size={20} color={style.color} />
            </View>
            <View>
              <Text style={styles.ticketType}>{ticket.type.toUpperCase()}</Text>
              <Text style={styles.ticketDate}>{ticket.date}</Text>
            </View>
            {ticket.time && <Text style={styles.ticketTime}>{ticket.time}</Text>}
          </View>

          {ticket.from && ticket.to ? (
            <View style={styles.routeRow}>
              <Text style={styles.station}>{ticket.from}</Text>
              <View style={styles.routeLine}>
                <View style={styles.routeDot} />
                <View style={[styles.routeLineLine, { backgroundColor: style.color + "60" }]} />
                <Feather name="arrow-right" size={14} color={style.color} />
              </View>
              <Text style={styles.station}>{ticket.to}</Text>
            </View>
          ) : (
            <Text style={styles.ticketTitle}>{ticket.title}</Text>
          )}

          {ticket.venue && (
            <View style={styles.venueRow}>
              <Feather name="map-pin" size={12} color="rgba(255,255,255,0.5)" />
              <Text style={styles.venueText}>{ticket.venue}</Text>
            </View>
          )}

          <View style={styles.dashed}>
            <View style={[styles.circle, { left: -20 }]} />
            <View style={styles.dashedLine} />
            <View style={[styles.circle, { right: -20 }]} />
          </View>

          <View style={styles.ticketBottom}>
            {ticket.seat && (
              <View>
                <Text style={styles.detailLabel}>SEAT</Text>
                <Text style={styles.detailValue}>{ticket.seat}</Text>
              </View>
            )}
            {ticket.pnr && (
              <View>
                <Text style={styles.detailLabel}>PNR</Text>
                <Text style={styles.detailValue}>
                  {revealed ? ticket.pnr : "••••••••"}
                </Text>
              </View>
            )}
            <View style={styles.tapHint}>
              {!revealed ? (
                <Text style={styles.tapText}>Tap to reveal</Text>
              ) : (
                <View style={styles.verifiedRow}>
                  <Feather name="check-circle" size={12} color="#2E7D32" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              )}
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  smartCard: {
    borderRadius: 24,
    padding: 20,
    overflow: "hidden",
    position: "relative",
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 24,
  },
  smartHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  transportRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  smartIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  transportLabel: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  trainInfo: {
    color: "#FFFDF9",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  smartRoute: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  smartStation: {
    color: "#FFFDF9",
    fontSize: 20,
    fontWeight: "900",
  },
  smartRouteLine: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  smartRouteDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  smartRouteDash: {
    flex: 1,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  passengerName: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  detailItem: {
    minWidth: "40%",
  },
  detailSmartLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  detailSmartValue: {
    color: "#FFFDF9",
    fontSize: 13,
    fontWeight: "700",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  revealBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  revealText: {
    fontSize: 12,
    fontWeight: "600",
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  verifiedText: {
    color: "#2E7D32",
    fontSize: 12,
    fontWeight: "600",
  },
  ticketCard: {
    borderRadius: 20,
    padding: 20,
    overflow: "hidden",
  },
  ticketHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  ticketIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  ticketType: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  ticketDate: { color: "#FFFDF9", fontSize: 14, fontWeight: "600", marginTop: 2 },
  ticketTime: { marginLeft: "auto", color: "#FFFDF9", fontSize: 16, fontWeight: "800" },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  station: { color: "#FFFDF9", fontSize: 22, fontWeight: "900" },
  routeLine: { flex: 1, flexDirection: "row", alignItems: "center", gap: 4 },
  routeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.4)" },
  routeLineLine: { flex: 1, height: 1 },
  ticketTitle: { color: "#FFFDF9", fontSize: 22, fontWeight: "800", marginBottom: 6 },
  venueRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 },
  venueText: { color: "rgba(255,255,255,0.5)", fontSize: 12 },
  dashed: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 14,
    overflow: "visible",
  },
  circle: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#0F0D0A",
    top: -7,
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.2)",
  },
  ticketBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  detailLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  detailValue: { color: "#FFFDF9", fontSize: 14, fontWeight: "800", letterSpacing: 1 },
  tapHint: { marginLeft: "auto" },
  tapText: { color: "rgba(255,255,255,0.4)", fontSize: 12 },
});
