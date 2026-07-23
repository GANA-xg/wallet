import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, isNull, lt } from "drizzle-orm";
import { getDb, schema } from "@workspace/db";
import { requireAuth } from "../middleware/auth";
import { logger } from "../lib/logger";
import {
  generateId,
  generateRefreshToken,
  getRefreshTokenTtl,
  getSessionTtl,
  hashToken,
  signJwt,
  verifyJwt,
} from "../lib/auth";
import { validate } from "../middlewares/validate";
import {
  sendOtpSchema,
  verifyOtpSchema,
  refreshSchema,
  updateProfileSchema,
  registerDeviceSchema,
  revokeSessionSchema,
  deviceIdParamSchema,
} from "@workspace/api-zod";

// In-memory OTP stores (ephemeral by nature — not persisted)
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

const otpRateLimitEnabled: boolean = (() => {
  const raw = process.env.OTP_RATE_LIMIT_MAX ?? "";
  if (raw === "0") return false;
  if (raw) return true;
  return process.env.NODE_ENV === "production";
})();
const otpRateLimitMax: number = parseInt(process.env.OTP_RATE_LIMIT_MAX || "5", 10);
const otpRateLimitWindowMs: number = parseInt(process.env.OTP_RATE_LIMIT_WINDOW_MS || "60000", 10);
const otpRequestLog = new Map<string, number[]>();

function paramId(req: Request): string {
  const id = req.params["id"];
  return Array.isArray(id) ? id[0] : id;
}

const router: IRouter = Router();

function toUserJson(user: typeof schema.users.$inferSelect) {
  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    kycStatus: user.kycStatus,
    twoFactorEnabled: user.twoFactorEnabled,
    biometricEnabled: user.biometricEnabled,
    createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
    updatedAt: user.updatedAt instanceof Date ? user.updatedAt.toISOString() : user.updatedAt,
  };
}

function toSessionJson(session: typeof schema.sessions.$inferSelect) {
  return {
    id: session.id,
    userId: session.userId,
    deviceId: session.deviceId,
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    lastActiveAt: session.lastActiveAt instanceof Date ? session.lastActiveAt.toISOString() : session.lastActiveAt,
    expiresAt: session.expiresAt instanceof Date ? session.expiresAt.toISOString() : session.expiresAt,
    revokedAt: session.revokedAt instanceof Date ? session.revokedAt.toISOString() : session.revokedAt,
    createdAt: session.createdAt instanceof Date ? session.createdAt.toISOString() : session.createdAt,
  };
}

async function findOrCreateUser(phone: string): Promise<typeof schema.users.$inferSelect> {
  const db = getDb();
  const existing = await db.query.users.findFirst({
    where: eq(schema.users.phone, phone),
  });
  if (existing) return existing;

  const now = new Date();
  const [newUser] = await db
    .insert(schema.users)
    .values({
      id: generateId(),
      tenantId: "00000000-0000-0000-0000-000000000000",
      phone,
      kycStatus: "pending",
      twoFactorEnabled: false,
      biometricEnabled: true,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return newUser;
}

async function issueTokens(userId: string, deviceId: string | null, ipAddress: string | null, userAgent: string | null) {
  const db = getDb();
  const sessionId = generateId();
  const now = new Date();
  const sessionExpiry = new Date(now.getTime() + getSessionTtl());

  const refreshTokenValue = generateRefreshToken();
  const refreshTokenHashed = hashToken(refreshTokenValue);

  const [session] = await db
    .insert(schema.sessions)
    .values({
      id: sessionId,
      userId,
      deviceId,
      refreshTokenHash: refreshTokenHashed,
      ipAddress,
      userAgent,
      lastActiveAt: now,
      expiresAt: sessionExpiry,
      createdAt: now,
    })
    .returning();

  await db.insert(schema.refreshTokens).values({
    id: generateId(),
    sessionId,
    tokenHash: refreshTokenHashed,
    expiresAt: sessionExpiry,
    createdAt: now,
  });

  const accessToken = signJwt({
    sub: userId,
    sid: sessionId,
    did: deviceId,
  });

  return { accessToken, refreshToken: refreshTokenValue, session };
}

async function validateRefreshToken(refreshToken: string): Promise<{ sessionId: string; userId: string } | null> {
  const db = getDb();
  const tokenHash = hashToken(refreshToken);

  const refreshTokenRow = await db.query.refreshTokens.findFirst({
    where: eq(schema.refreshTokens.tokenHash, tokenHash),
  });
  if (!refreshTokenRow) return null;

  const session = await db.query.sessions.findFirst({
    where: eq(schema.sessions.id, refreshTokenRow.sessionId),
  });
  if (!session || session.revokedAt) return null;

  const expiresAt = session.expiresAt instanceof Date ? session.expiresAt.getTime() : new Date(session.expiresAt).getTime();
  if (expiresAt < Date.now()) return null;

  return { sessionId: session.id, userId: session.userId };
}

async function rotateRefreshToken(sessionId: string): Promise<string | null> {
  const db = getDb();
  const session = await db.query.sessions.findFirst({
    where: eq(schema.sessions.id, sessionId),
  });
  if (!session || session.revokedAt) return null;

  const newRefreshToken = generateRefreshToken();
  const newHash = hashToken(newRefreshToken);
  const now = new Date();

  await db
    .update(schema.sessions)
    .set({ refreshTokenHash: newHash, lastActiveAt: now })
    .where(eq(schema.sessions.id, sessionId));

  await db
    .update(schema.refreshTokens)
    .set({ tokenHash: newHash })
    .where(eq(schema.refreshTokens.sessionId, sessionId));

  return newRefreshToken;
}

async function cleanExpired(): Promise<void> {
  const db = getDb();
  const now = new Date();
  await db
    .delete(schema.sessions)
    .where(
      and(
        lt(schema.sessions.expiresAt, now),
      ),
    )
    .catch(() => {});
  // Prune expired OTPs from memory
  for (const [phone, entry] of otpStore) {
    if (entry.expiresAt < now.getTime()) {
      otpStore.delete(phone);
    }
  }
}

// POST /auth/otp/send
router.post("/auth/otp/send", validate({ schema: sendOtpSchema, source: "body" }), (req: Request, res: Response) => {
  const { phone } = req.body;

  if (otpRateLimitEnabled) {
    const now = Date.now();
    const timestamps = otpRequestLog.get(phone) || [];
    const recent = timestamps.filter((t) => now - t < otpRateLimitWindowMs);
    if (recent.length >= otpRateLimitMax) {
      logger.warn({ phone }, "OTP rate limit exceeded");
      res.status(429).json({ error: "Too many OTP requests. Please try again later." });
      return;
    }
    recent.push(now);
    otpRequestLog.set(phone, recent);
    if (otpRequestLog.size > 1000) {
      for (const [key, timestamps] of otpRequestLog) {
        otpRequestLog.set(key, timestamps.filter((t) => now - t < otpRateLimitWindowMs));
        if (otpRequestLog.get(key)!.length === 0) otpRequestLog.delete(key);
      }
    }
  }

  const otp = process.env.DEV_OTP || "000000";
  otpStore.set(phone, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });

  if (process.env.NODE_ENV !== "production") {
    logger.info({ phone }, "OTP sent (dev mode)");
  }
  res.json({ message: "OTP sent successfully", expiresIn: 300 });
});

// POST /auth/otp/verify
router.post("/auth/otp/verify", validate({ schema: verifyOtpSchema, source: "body" }), async (req: Request, res: Response) => {
  try {
    const { phone, otp, deviceName, deviceIdentifier } = req.body;

    const stored = otpStore.get(phone);
    if (!stored || stored.otp !== otp) {
      res.status(401).json({ error: "Invalid or expired OTP" });
      return;
    }

    if (stored.expiresAt < Date.now()) {
      otpStore.delete(phone);
      res.status(401).json({ error: "OTP has expired" });
      return;
    }

    otpStore.delete(phone);

    const user = await findOrCreateUser(phone);
    const db = getDb();

    let deviceId: string | null = null;
    if (deviceIdentifier) {
      const existingDevice = await db.query.devices.findFirst({
        where: and(
          eq(schema.devices.deviceIdentifier, deviceIdentifier),
          eq(schema.devices.userId, user.id),
        ),
      });

      if (existingDevice) {
        deviceId = existingDevice.id;
        await db
          .update(schema.devices)
          .set({ lastUsedAt: new Date() })
          .where(eq(schema.devices.id, existingDevice.id));
      } else {
        deviceId = generateId();
        const now = new Date();
        await db.insert(schema.devices).values({
          id: deviceId,
          userId: user.id,
          deviceName: deviceName ?? null,
          deviceIdentifier,
          lastUsedAt: now,
          enrolledAt: now,
        });
      }
    }

    const tokens = await issueTokens(user.id, deviceId, req.ip ?? null, req.headers["user-agent"] ?? null);

    res.json({
      user: toUserJson(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    logger.error({ err: error }, "OTP verify failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/refresh
router.post("/auth/refresh", validate({ schema: refreshSchema, source: "body" }), async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    const result = await validateRefreshToken(refreshToken);
    if (!result) {
      res.status(401).json({ error: "Invalid or expired refresh token" });
      return;
    }

    const newRefreshToken = await rotateRefreshToken(result.sessionId);
    if (!newRefreshToken) {
      res.status(401).json({ error: "Session has been revoked" });
      return;
    }

    const db = getDb();
    const session = await db.query.sessions.findFirst({
      where: eq(schema.sessions.id, result.sessionId),
    });
    const accessToken = signJwt({
      sub: result.userId,
      sid: result.sessionId,
      did: session?.deviceId ?? null,
    });

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (error) {
    logger.error({ err: error }, "Token refresh failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/logout
router.post("/auth/logout", requireAuth, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    await db
      .update(schema.sessions)
      .set({ revokedAt: new Date() })
      .where(eq(schema.sessions.id, req.user!.sessionId));

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    logger.error({ err: error }, "Logout failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /auth/me
router.get("/auth/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, req.user!.userId),
    });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const session = await db.query.sessions.findFirst({
      where: eq(schema.sessions.id, req.user!.sessionId),
    });
    if (!session || session.revokedAt) {
      res.status(401).json({ error: "Session has been revoked" });
      return;
    }

    await db
      .update(schema.sessions)
      .set({ lastActiveAt: new Date() })
      .where(eq(schema.sessions.id, req.user!.sessionId));

    res.json({ user: toUserJson(user) });
  } catch (error) {
    logger.error({ err: error }, "Failed to get user profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /auth/me
router.patch(
  "/auth/me",
  requireAuth,
  validate({ schema: updateProfileSchema, source: "body" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, req.user!.userId),
      });
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const session = await db.query.sessions.findFirst({
        where: eq(schema.sessions.id, req.user!.sessionId),
      });
      if (!session || session.revokedAt) {
        res.status(401).json({ error: "Session has been revoked" });
        return;
      }

      const { name, email } = req.body;
      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (name !== undefined) updates.name = name;
      if (email !== undefined) updates.email = email;

      const [updated] = await db
        .update(schema.users)
        .set(updates)
        .where(eq(schema.users.id, req.user!.userId))
        .returning();

      await db
        .update(schema.sessions)
        .set({ lastActiveAt: new Date() })
        .where(eq(schema.sessions.id, req.user!.sessionId));

      res.json({ user: toUserJson(updated) });
    } catch (error) {
      logger.error({ err: error }, "Failed to update profile");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// POST /auth/devices/register
router.post(
  "/auth/devices/register",
  requireAuth,
  validate({ schema: registerDeviceSchema, source: "body" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const { deviceName, deviceIdentifier, pushToken } = req.body;

      const existing = await db.query.devices.findFirst({
        where: and(
          eq(schema.devices.deviceIdentifier, deviceIdentifier),
          eq(schema.devices.userId, userId),
        ),
      });

      if (existing && !existing.revokedAt) {
        const [updated] = await db
          .update(schema.devices)
          .set({
            deviceName: deviceName ?? existing.deviceName,
            pushToken: pushToken ?? existing.pushToken,
            lastUsedAt: new Date(),
          })
          .where(eq(schema.devices.id, existing.id))
          .returning();
        res.json({ device: updated });
        return;
      }

      const now = new Date();
      const [device] = await db
        .insert(schema.devices)
        .values({
          id: generateId(),
          userId,
          deviceName: deviceName ?? null,
          deviceIdentifier,
          pushToken: pushToken ?? null,
          lastUsedAt: now,
          enrolledAt: now,
        })
        .returning();

      res.status(201).json({ device });
    } catch (error) {
      logger.error({ err: error }, "Failed to register device");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// DELETE /auth/devices/:id
router.delete(
  "/auth/devices/:id",
  requireAuth,
  validate({ schema: deviceIdParamSchema, source: "params" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const deviceId = paramId(req);

      const device = await db.query.devices.findFirst({
        where: eq(schema.devices.id, deviceId),
      });

      if (!device || device.userId !== req.user!.userId) {
        res.status(404).json({ error: "Device not found" });
        return;
      }

      await db
        .update(schema.devices)
        .set({ revokedAt: new Date() })
        .where(eq(schema.devices.id, deviceId));

      await db
        .update(schema.sessions)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(schema.sessions.deviceId, deviceId),
            isNull(schema.sessions.revokedAt),
          ),
        );

      res.json({ message: "Device removed" });
    } catch (error) {
      logger.error({ err: error }, "Failed to remove device");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// GET /auth/devices
router.get("/auth/devices", requireAuth, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const userDevices = await db.query.devices.findMany({
      where: and(
        eq(schema.devices.userId, req.user!.userId),
        isNull(schema.devices.revokedAt),
      ),
    });
    res.json({ devices: userDevices });
  } catch (error) {
    logger.error({ err: error }, "Failed to list devices");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /auth/sessions
router.get("/auth/sessions", requireAuth, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const userSessions = await db.query.sessions.findMany({
      where: and(
        eq(schema.sessions.userId, req.user!.userId),
        isNull(schema.sessions.revokedAt),
      ),
    });
    res.json({ sessions: userSessions.map(toSessionJson) });
  } catch (error) {
    logger.error({ err: error }, "Failed to list sessions");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/sessions/revoke
router.post(
  "/auth/sessions/revoke",
  requireAuth,
  validate({ schema: revokeSessionSchema, source: "body" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const { sessionId } = req.body;

      const session = await db.query.sessions.findFirst({
        where: eq(schema.sessions.id, sessionId),
      });
      if (!session || session.userId !== req.user!.userId) {
        res.status(404).json({ error: "Session not found" });
        return;
      }

      await db
        .update(schema.sessions)
        .set({ revokedAt: new Date() })
        .where(eq(schema.sessions.id, sessionId));

      res.json({ message: "Session revoked" });
    } catch (error) {
      logger.error({ err: error }, "Failed to revoke session");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
