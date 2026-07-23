import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface TicketTimelineProps {
  from?: string;
  to?: string;
  stations?: string[];
  completedStations?: string[];
  currentStation?: string;
  stationTimes?: Record<string, { arrival?: string; departure?: string }>;
}

export default function TicketTimeline({
  from,
  to,
  stations,
  currentStation,
  stationTimes,
}: TicketTimelineProps) {
  const allStations = stations?.length ? stations : [];

  if (!from && !to && !allStations.length) return null;

  const displayStations = allStations.length
    ? allStations
    : [from, to].filter(Boolean) as string[];

  if (!displayStations.length) return null;

  const resolvedCurrent = currentStation ?? displayStations[Math.max(0, displayStations.length - 2)];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Route</Text>
      <View style={styles.timeline}>
        {displayStations.map((station, index) => {
          const isFirst = index === 0;
          const isLast = index === displayStations.length - 1;
          const isCurrent = station === resolvedCurrent && !isLast;

          let dotColor = "rgba(255,255,255,0.2)";
          if (isFirst) dotColor = "#22C55E";
          else if (isLast) dotColor = "#EF4444";
          else if (isCurrent) dotColor = "#F59E0B";

          const times = stationTimes?.[station];
          const timeLabel = times?.departure ?? times?.arrival;
          const timeSublabel = times?.departure && times?.arrival ? "dep" : times?.departure ? "dep" : "arr";

          return (
            <View key={`${station}-${index}`} style={styles.stationRow}>
              <View style={styles.timelineLeft}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: dotColor },
                    isCurrent && styles.dotActive,
                  ]}
                />
                {index < displayStations.length - 1 && (
                  <View
                    style={[
                      styles.line,
                      { backgroundColor: isFirst ? "#22C55E" : "rgba(255,255,255,0.1)" },
                    ]}
                  />
                )}
              </View>
              <View style={styles.stationInfo}>
                <View style={styles.stationNameRow}>
                  <Text
                    style={[
                      styles.stationName,
                      isFirst && styles.departureStation,
                      isLast && styles.destinationStation,
                      isCurrent && styles.currentStation,
                    ]}
                  >
                    {station}
                  </Text>
                  {timeLabel && (
                    <View style={styles.timeChip}>
                      <Text style={styles.timeText}>{timeLabel}</Text>
                      {times?.arrival && times?.departure && (
                        <Text style={styles.timeSubtext}>{timeSublabel}</Text>
                      )}
                    </View>
                  )}
                </View>
                {isFirst && <Text style={styles.stationTag}>BOARDING</Text>}
                {isLast && <Text style={[styles.stationTag, { color: "#EF4444" }]}>DESTINATION</Text>}
                {isCurrent && (
                  <Text style={[styles.stationTag, { color: "#F59E0B" }]}>CURRENT</Text>
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
  dotActive: {
    width: 14,
    height: 14,
    borderRadius: 7,
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
  stationNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stationName: {
    color: "#FFFDF9",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  departureStation: {
    fontSize: 16,
    fontWeight: "800",
    color: "#22C55E",
  },
  destinationStation: {
    fontSize: 16,
    fontWeight: "800",
    color: "#EF4444",
  },
  currentStation: {
    color: "#F59E0B",
  },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  timeText: {
    color: "#FFFDF9",
    fontSize: 12,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  timeSubtext: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 8,
    fontWeight: "600",
  },
  stationTag: {
    color: "#22C55E",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
