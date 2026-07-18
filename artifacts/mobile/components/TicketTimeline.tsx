import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface TicketTimelineProps {
  from?: string;
  to?: string;
  stations?: string[];
  completedStations?: string[];
  currentStation?: string;
}

export default function TicketTimeline({
  from,
  to,
  stations,
}: TicketTimelineProps) {
  const allStations = stations?.length ? stations : [];

  if (!from && !to && !allStations.length) return null;

  const displayStations = allStations.length
    ? allStations
    : [from, to].filter(Boolean) as string[];

  if (!displayStations.length) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Journey Route</Text>
      <View style={styles.timeline}>
        {displayStations.map((station, index) => {
          const isFirst = index === 0;
          const isLast = index === displayStations.length - 1;
          const isCompleted = index < displayStations.length - 2;
          const isCurrent = index === displayStations.length - 2;

          let dotColor = "rgba(255,255,255,0.2)";
          if (isFirst) dotColor = "#2E7D32";
          else if (isLast) dotColor = "#D06224";
          else if (isCurrent) dotColor = "#AE431E";

          return (
            <View key={`${station}-${index}`} style={styles.stationRow}>
              <View style={styles.timelineLeft}>
                <View
                  style={[styles.dot, { backgroundColor: dotColor }]}
                />
                {index < displayStations.length - 1 && (
                  <View
                    style={[
                      styles.line,
                      { backgroundColor: isCompleted ? "#2E7D32" : "rgba(255,255,255,0.1)" },
                    ]}
                  />
                )}
              </View>
              <View style={styles.stationInfo}>
                <Text
                  style={[
                    styles.stationName,
                    isFirst && styles.departureStation,
                    isLast && styles.destinationStation,
                  ]}
                >
                  {station}
                </Text>
                {isFirst && <Text style={styles.stationTag}>DEPARTURE</Text>}
                {isLast && <Text style={[styles.stationTag, { color: "#D06224" }]}>DESTINATION</Text>}
                {isCurrent && !isLast && (
                  <Text style={[styles.stationTag, { color: "#AE431E" }]}>CURRENT</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  title: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  timeline: {
    gap: 0,
  },
  stationRow: {
    flexDirection: "row",
    gap: 12,
  },
  timelineLeft: {
    alignItems: "center",
    width: 16,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.15)",
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 24,
  },
  stationInfo: {
    flex: 1,
    paddingBottom: 16,
    gap: 2,
  },
  stationName: {
    color: "#FFFDF9",
    fontSize: 14,
    fontWeight: "600",
  },
  departureStation: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2E7D32",
  },
  destinationStation: {
    fontSize: 16,
    fontWeight: "800",
    color: "#D06224",
  },
  stationTag: {
    color: "#2E7D32",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
