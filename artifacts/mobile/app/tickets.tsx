import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";
import type { Ticket } from "@/types";

import TicketCard from "../components/TicketCard";

const TICKET_STYLES: Record<Ticket["type"], { gradient: [string, string]; icon: keyof typeof Feather.glyphMap; color: string }> = {
  flight: { gradient: ["#0f2040", "#1e3a5f"], icon: "navigation", color: "#3B82F6" },
  movie: { gradient: ["#200f40", "#3b1f5f"], icon: "film", color: "#8B5CF6" },
  train: { gradient: ["#0f3320", "#1a5c35"], icon: "truck", color: "#22C55E" },
  bus: { gradient: ["#3d2700", "#5f3e0f"], icon: "map", color: "#F59E0B" },
  event: { gradient: ["#3d0f1f", "#5c1a2e"], icon: "star", color: "#EC4899" },
};

function LegacyTicketCard({ ticket }: { ticket: Ticket }) {
  const style = TICKET_STYLES[ticket.type];
  const [revealed, setRevealed] = useState(false);
  const shakeAnim = React.useRef(new Animated.Value(0)).current;

  const handleReveal = () => {
    if (revealed) return;
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 5, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start(() => setRevealed(true));
  };

  return (
    <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
      <TouchableOpacity onPress={handleReveal} activeOpacity={0.95}>
        <LinearGradient colors={style.gradient} style={styles.ticketCard}>
          <View style={styles.ticketHeader}>
            <View style={[styles.ticketIconWrap, { backgroundColor: style.color + "30" }]}>
              <Feather name={style.icon} size={20} color={style.color} />
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
                  <Feather name="check-circle" size={12} color="#22C55E" />
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

export default function TicketsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tickets } = useWallet();

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>My Tickets</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Add Ticket Button */}
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push("/add-ticket" as never);
        }}
        activeOpacity={0.85}
      >
        <Feather name="plus" size={18} color="#fff" />
        <Text style={styles.addButtonText}>Add Ticket</Text>
      </TouchableOpacity>

      {tickets.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: colors.surface }]}>
          <Feather name="tag" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No tickets yet</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            Your travel and event tickets will appear here
          </Text>
        </View>
      ) : (
        <View style={styles.ticketList}>
          {tickets.map((ticket) => {
            if (ticket.isSmartTicket) {
              return <TicketCard key={ticket.id} ticket={ticket} />;
            }
            return <LegacyTicketCard key={ticket.id} ticket={ticket} />;
          })}
        </View>
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
    marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: "800" },
  ticketList: { gap: 16 },
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
  ticketDate: { color: "#fff", fontSize: 14, fontWeight: "600", marginTop: 2 },
  ticketTime: { marginLeft: "auto", color: "#fff", fontSize: 16, fontWeight: "800" },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  station: { color: "#fff", fontSize: 22, fontWeight: "900" },
  routeLine: { flex: 1, flexDirection: "row", alignItems: "center", gap: 4 },
  routeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.4)" },
  routeLineLine: { flex: 1, height: 1 },
  ticketTitle: { color: "#fff", fontSize: 22, fontWeight: "800", marginBottom: 6 },
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
    backgroundColor: "#0F1115",
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
  detailValue: { color: "#fff", fontSize: 14, fontWeight: "800", letterSpacing: 1 },
  tapHint: { marginLeft: "auto" },
  tapText: { color: "rgba(255,255,255,0.4)", fontSize: 12 },
  verifiedRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  verifiedText: { color: "#22C55E", fontSize: 12, fontWeight: "600" },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 16,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  empty: { alignItems: "center", padding: 40, borderRadius: 20, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptySub: { fontSize: 14, textAlign: "center" },
});
