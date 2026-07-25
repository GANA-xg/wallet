import { io, Socket } from "socket.io-client";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiBaseUrl, getAccessToken } from "./api";

const LAST_SYNCED_KEY = "vault_last_synced_at";

let socket: Socket | null = null;
let eventHandlers: Record<string, (payload: any) => void> = {};

export function setSocketHandlers(handlers: Record<string, (payload: any) => void>) {
  eventHandlers = handlers;
}

export async function connectSocket() {
  if (socket?.connected) return;

  const token = await getAccessToken();
  if (!token) return;

  const lastSyncedAt = await AsyncStorage.getItem(LAST_SYNCED_KEY);

  socket = io(apiBaseUrl(), {
    auth: {
      token,
      lastSyncedAt: lastSyncedAt || undefined,
    },
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on("connect", () => {
    console.log("[socket] connected");
  });

  socket.on("disconnect", () => {
    console.log("[socket] disconnected");
    AsyncStorage.setItem(LAST_SYNCED_KEY, new Date().toISOString()).catch(() => {});
  });

  socket.on("connect_error", (err) => {
    console.warn("[socket] connect error:", err.message);
  });

  // Wire event handlers
  socket.on("wallet:updated", (payload) => {
    eventHandlers["wallet:updated"]?.(payload);
  });

  socket.on("transaction:new", (payload) => {
    eventHandlers["transaction:new"]?.(payload);
  });

  socket.on("notification:new", (payload) => {
    eventHandlers["notification:new"]?.(payload);
  });

  socket.on("subscription:detected", (payload) => {
    eventHandlers["subscription:detected"]?.(payload);
  });
}

export function disconnectSocket() {
  if (socket) {
    AsyncStorage.setItem(LAST_SYNCED_KEY, new Date().toISOString()).catch(() => {});
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}
