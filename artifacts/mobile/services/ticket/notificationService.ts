import { Platform } from "react-native";

import type { Ticket } from "@/types";

const NOTIFICATIONS_KEY = "@vault_scheduled_notifications";

interface ScheduledNotification {
  ticketId: string;
  type: "day_before" | "hour_before";
  triggerDate: string;
}

async function getScheduled(): Promise<ScheduledNotification[]> {
  try {
    const { MMKV } = require("react-native-mmkv");
    const storage = new MMKV();
    const raw = storage.getString(NOTIFICATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    try {
      const AsyncStorage = require("@react-native-async-storage/async-storage").default;
      const raw = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}

async function saveScheduled(list: ScheduledNotification[]): Promise<void> {
  try {
    const { MMKV } = require("react-native-mmkv");
    const storage = new MMKV();
    storage.set(NOTIFICATIONS_KEY, JSON.stringify(list));
  } catch {
    try {
      const AsyncStorage = require("@react-native-async-storage/async-storage").default;
      await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(list));
    } catch {}
  }
}

function getLocalNotificationModule() {
  try {
    const Notifications = require("expo-notifications");
    return Notifications;
  } catch {
    return null;
  }
}

export async function scheduleJourneyNotifications(ticket: Ticket): Promise<void> {
  const Notifications = getLocalNotificationModule();
  if (!Notifications) return;

  const { default: NotificationsModule } = Notifications;

  const journeyDate = new Date(ticket.date);
  if (isNaN(journeyDate.getTime())) return;

  const timeParts = ticket.time?.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (timeParts) {
    let hours = parseInt(timeParts[1], 10);
    const minutes = parseInt(timeParts[2], 10);
    const meridian = timeParts[3]?.toUpperCase();
    if (meridian === "PM" && hours !== 12) hours += 12;
    if (meridian === "AM" && hours === 12) hours = 0;
    journeyDate.setHours(hours, minutes, 0, 0);
  } else {
    journeyDate.setHours(10, 0, 0, 0);
  }

  const now = new Date();

  const dayBeforeDate = new Date(journeyDate.getTime() - 24 * 60 * 60 * 1000);
  const hourBeforeDate = new Date(journeyDate.getTime() - 60 * 60 * 1000);

  if (dayBeforeDate > now) {
    try {
      await NotificationsModule.scheduleNotificationAsync({
        content: {
          title: "Journey Reminder",
          body: `Your journey starts tomorrow.\n${ticket.from ?? ""} → ${ticket.to ?? ""} • ${ticket.date} • ${ticket.time ?? ""}`,
          data: { ticketId: ticket.id, type: "journey_reminder" },
        },
        trigger: { date: dayBeforeDate },
      });
    } catch {}
  }

  if (hourBeforeDate > now) {
    try {
      await NotificationsModule.scheduleNotificationAsync({
        content: {
          title: "Journey Departing Soon",
          body: `Your journey departs in 1 hour.\nCoach: ${ticket.coach ?? "—"} • Seat: ${ticket.seat ?? "—"}\n${ticket.from ?? ""} → ${ticket.to ?? ""}`,
          data: { ticketId: ticket.id, type: "journey_departing" },
        },
        trigger: { date: hourBeforeDate },
      });
    } catch {}
  }

  const scheduled = await getScheduled();
  scheduled.push(
    { ticketId: ticket.id, type: "day_before", triggerDate: dayBeforeDate.toISOString() },
    { ticketId: ticket.id, type: "hour_before", triggerDate: hourBeforeDate.toISOString() },
  );
  await saveScheduled(scheduled);
}

export async function cancelTicketNotifications(ticketId: string): Promise<void> {
  const Notifications = getLocalNotificationModule();
  if (!Notifications) return;

  const { default: NotificationsModule } = Notifications;

  try {
    const scheduled = await NotificationsModule.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
      if (notification.content.data?.ticketId === ticketId) {
        await NotificationsModule.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  } catch {}

  const scheduled = await getScheduled();
  const filtered = scheduled.filter((s) => s.ticketId !== ticketId);
  await saveScheduled(filtered);
}

export async function rescheduleAllNotifications(tickets: Ticket[]): Promise<void> {
  const Notifications = getLocalNotificationModule();
  if (!Notifications) return;

  const { default: NotificationsModule } = Notifications;

  try {
    await NotificationsModule.cancelAllScheduledNotificationsAsync();
  } catch {}

  for (const ticket of tickets) {
    if (ticket.isSmartTicket) {
      await scheduleJourneyNotifications(ticket);
    }
  }
}
