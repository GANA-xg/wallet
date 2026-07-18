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
      <Text style={styles.label}>Journey starts in</Text>
      <View style={styles.timerRow}>
        <View style={styles.timeBlock}>
          <Text style={styles.timeValue}>{totalDays}</Text>
          <Text style={styles.timeUnit}>Days</Text>
        </View>
        <Text style={styles.separator}>:</Text>
        <View style={styles.timeBlock}>
          <Text style={styles.timeValue}>{timeLeft.hours}</Text>
          <Text style={styles.timeUnit}>Hours</Text>
        </View>
        <Text style={styles.separator}>:</Text>
        <View style={styles.timeBlock}>
          <Text style={styles.timeValue}>{timeLeft.minutes}</Text>
          <Text style={styles.timeUnit}>Min</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 12,
    gap: 8,
  },
  label: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeBlock: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 60,
  },
  timeValue: {
    color: "#FFFDF9",
    fontSize: 22,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  timeUnit: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 9,
    fontWeight: "600",
    marginTop: 2,
  },
  separator: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 16,
  },
});
