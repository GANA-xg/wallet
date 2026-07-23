import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

interface TicketCountdownProps {
  date: string;
  time?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
}

function calculateTimeLeft(journeyDate: Date): TimeLeft {
  const now = new Date();
  const diff = journeyDate.getTime() - now.getTime();

  if (diff <= 0) return { days: 0, hours: 0, minutes: 0 };

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
  };
}

export default function TicketCountdown({ date, time }: TicketCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0 });

  useEffect(() => {
    const journeyDate = new Date(date);
    if (isNaN(journeyDate.getTime())) return;

    const timeParts = time?.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (timeParts) {
      let hours = parseInt(timeParts[1], 10);
      const minutes = parseInt(timeParts[2], 10);
      const meridian = timeParts[3]?.toUpperCase();
      if (meridian === "PM" && hours !== 12) hours += 12;
      if (meridian === "AM" && hours === 12) hours = 0;
      journeyDate.setHours(hours, minutes, 0, 0);
    }

    setTimeLeft(calculateTimeLeft(journeyDate));

    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft(journeyDate));
    }, 60000);

    return () => clearInterval(interval);
  }, [date, time]);

  const totalDays = timeLeft.days;
  const totalHours = timeLeft.hours + totalDays * 24;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>JOURNEY STARTS IN</Text>
      <View style={styles.chipRow}>
        <View style={styles.chip}>
          <Text style={styles.chipValue}>{totalDays}</Text>
          <Text style={styles.chipUnit}>d</Text>
        </View>
        <Text style={styles.chipSep}>:</Text>
        <View style={styles.chip}>
          <Text style={styles.chipValue}>{timeLeft.hours}</Text>
          <Text style={styles.chipUnit}>h</Text>
        </View>
        <Text style={styles.chipSep}>:</Text>
        <View style={styles.chip}>
          <Text style={styles.chipValue}>{timeLeft.minutes}</Text>
          <Text style={styles.chipUnit}>m</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    marginTop: 2,
    marginBottom: 4,
  },
  label: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  chip: {
    flexDirection: "row",
    alignItems: "baseline",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 2,
  },
  chipValue: {
    color: "#FFFDF9",
    fontSize: 14,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  chipUnit: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    fontWeight: "600",
  },
  chipSep: {
    color: "rgba(255,255,255,0.2)",
    fontSize: 12,
    fontWeight: "700",
  },
});
