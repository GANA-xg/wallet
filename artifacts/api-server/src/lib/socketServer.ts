import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { verifyJwt } from "./auth";
import { getDb, schema } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { logger } from "./logger";

let io: Server | null = null;

export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      // TODO: lock down to app domain before production
      origin: "*",
    },
  });

  io.on("connection", async (socket) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      socket.disconnect(true);
      return;
    }

    const payload = verifyJwt(token);
    if (!payload) {
      socket.disconnect(true);
      return;
    }

    const userId = payload.sub;
    socket.join(userId);

    // Replay missed events on reconnect
    const lastSyncedAt = socket.handshake.auth.lastSyncedAt as string | undefined;
    if (lastSyncedAt) {
      try {
        const db = getDb();
        const missedEvents = await db
          .select()
          .from(schema.eventLog)
          .where(
            and(
              eq(schema.eventLog.userId, userId),
              gt(schema.eventLog.createdAt, new Date(lastSyncedAt)),
            ),
          )
          .orderBy(schema.eventLog.createdAt);

        for (const event of missedEvents) {
          socket.emit(event.eventType, event.payload);
        }
      } catch (err) {
        logger.error({ err }, "Failed to replay missed events");
      }
    }

    logger.info({ userId }, "[socket] client connected");
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error("Socket.IO not initialized. Call initSocketServer first.");
  }
  return io;
}

export function emitToUser(
  userId: string,
  event: string,
  payload: Record<string, unknown>,
): void {
  if (!io) {
    logger.warn({ userId, event }, "[socket] IO not initialized, skipping emit");
    return;
  }
  io.to(userId).emit(event, payload);
}

export async function logAndEmit(
  userId: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const db = getDb();
  try {
    await db.insert(schema.eventLog).values({
      userId,
      eventType,
      payload,
      createdAt: new Date(),
    });
  } catch (err) {
    logger.error({ err, userId, eventType }, "Failed to write event_log");
  }

  emitToUser(userId, eventType, payload);
}
