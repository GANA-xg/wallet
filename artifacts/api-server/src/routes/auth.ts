import { Router, type IRouter, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { eq, and, isNull } from "drizzle-orm";
import { getDb, schema } from "@workspace/db";
import { requireAuth } from "../middleware/auth";
import { logger } from "../lib/logger";
import {
  generateRefreshToken,
  hashToken,
  signJwt,
} from "../lib/auth";
import { validate } from "../middlewares/validate";
import {
  sendOtpSchema,
  verifyOtpSchema,
  registerSchema,
  refreshSchema,
  updateProfileSchema,
  registerDeviceSchema,
  revokeSessionSchema,
  deviceIdParamSchema,
} from "@workspace/api-zod";
import { setOtp as redisSetOtp, getOtp as redisGetOtp, incrementOtpAttempts as redisIncrementAttempts, deleteOtp as redisDeleteOtp } from "../lib/redis";

// In-memory OTP fallback when Redis is unavailable
const memOtpStore = new Map<string, { otp: string; attempts: number; expiresAt: number }>();

async function setOtp(phone: string, otp: string, ttl: number): Promise<void> {
  // Always write to in-memory store (authoritative source when Redis is absent)
  memOtpStore.set(phone, { otp, attempts: 0, expiresAt: Date.now() + ttl * 1000 });
  // Best-effort Redis write
  redisSetOtp(phone, otp, ttl).catch(() => {});
}

async function getOtp(phone: string): Promise<{ otp: string; attempts: number } | null> {
  // Check in-memory first (fast, always available)
  const stored = memOtpStore.get(phone);
  if (!stored) {
    // Fallback to Redis (survives restarts)
    try {
      return await redisGetOtp(phone);
    } catch {}
    return null;
  }
  if (stored.expiresAt < Date.now()) {
    memOtpStore.delete(phone);
    return null;
  }
  return { otp: stored.otp, attempts: stored.attempts };
}

async function incrementOtpAttempts(phone: string): Promise<number> {
  const stored = memOtpStore.get(phone);
  if (!stored) return 0;
  stored.attempts++;
  redisIncrementAttempts(phone).catch(() => {});
  return stored.attempts;
}

async function deleteOtp(phone: string): Promise<void> {
  memOtpStore.delete(phone);
  redisDeleteOtp(phone).catch(() => {});
}

// Strict OTP rate limiter — max 3 requests per 10 minutes per IP
const otpRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "too_many_otp_requests",
    message: "Max 3 OTP requests per 10 minutes",
  },
});

function validateE164(phone: string): { valid: boolean; normalized: string } {
  // Auto-prepend +91 (India) if just digits without prefix
  const normalized = phone.startsWith("+") ? phone : `+91${phone}`;
  const valid = /^\+[1-9]\d{7,14}$/.test(normalized);
  return { valid, normalized };
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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
    kyc_status: user.kycStatus,
    created_at: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
  };
}

async function findOrCreateDevice(
  userId: string,
  deviceFingerprint: string,
  pushToken: string | undefined,
): Promise<string> {
  const db = getDb();
  const existing = await db.query.devices.findFirst({
    where: and(
      eq(schema.devices.userId, userId),
      eq(schema.devices.deviceFingerprint, deviceFingerprint),
      isNull(schema.devices.deletedAt),
    ),
  });

  const now = new Date();

  if (existing) {
    await db
      .update(schema.devices)
      .set({
        lastSeenAt: now,
        pushToken: pushToken ?? existing.pushToken,
        updatedAt: now,
      })
      .where(eq(schema.devices.id, existing.id));
    return existing.id;
  }

  const [device] = await db
    .insert(schema.devices)
    .values({
      userId,
      deviceFingerprint,
      pushToken: pushToken ?? null,
      isTrusted: false,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return device.id;
}

async function createSession(
  userId: string,
  deviceId: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const db = getDb();
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const [session] = await db
    .insert(schema.sessions)
    .values({
      userId,
      deviceId,
      refreshTokenHash,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const accessToken = signJwt({
    sub: userId,
    sid: session.id,
    did: deviceId,
  });

  return { accessToken, refreshToken };
}

// POST /auth/send-otp
router.post(
  "/auth/send-otp",
  otpRateLimiter,
  validate({ schema: sendOtpSchema, source: "body" }),
  async (req: Request, res: Response) => {
    const { phone } = req.body;

    const { valid, normalized } = validateE164(phone);
    if (!valid) {
      res.status(400).json({ error: "Invalid phone format. Use E.164 format (+XXXXXXXXXXX)" });
      return;
    }

    const otp = process.env.DEV_OTP || generateOtp();
    await setOtp(normalized, otp, 300);

    // TODO: integrate SMS provider (Twilio, MSG91, etc.)
    // For dev only, log the OTP
    logger.info({ phone, otp }, "[DEV ONLY] OTP generated — remove DEV_OTP env var in production");

    res.json({ message: "OTP sent", otp });
  },
);

// POST /auth/verify-otp
router.post("/auth/verify-otp", validate({ schema: verifyOtpSchema, source: "body" }), async (req: Request, res: Response) => {
  try {
    const { phone, otp, device_fingerprint, push_token } = req.body;
    const { valid, normalized } = validateE164(phone);
    if (!valid) {
      res.status(400).json({ error: "Invalid phone format" });
      return;
    }

    const stored = await getOtp(normalized);
    if (!stored || stored.otp !== otp) {
      if (stored) {
        const attempts = await incrementOtpAttempts(normalized);
        if (attempts >= 3) {
          await deleteOtp(normalized);
          res.status(429).json({
            error: "too_many_attempts",
            message: "OTP invalidated after 3 failed attempts",
          });
          return;
        }
      }
      res.status(401).json({ error: "Invalid or expired OTP" });
      return;
    }

    await deleteOtp(normalized);

    const db = getDb();
    const user = await db.query.users.findFirst({
      where: eq(schema.users.phone, normalized),
    });

    if (!user) {
      res.json({ requires_registration: true, phone: normalized });
      return;
    }

    const deviceId = await findOrCreateDevice(user.id, device_fingerprint, push_token);
    const tokens = await createSession(user.id, deviceId);

    res.json({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      user: toUserJson(user),
    });
  } catch (error) {
    logger.error({ err: error }, "OTP verify failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/register
router.post("/auth/register", validate({ schema: registerSchema, source: "body" }), async (req: Request, res: Response) => {
  try {
    const { phone, otp, name, device_fingerprint, push_token } = req.body;

    if (!name || name.trim().length === 0) {
      res.status(400).json({ error: "Name is required" });
      return;
    }

    const { valid, normalized } = validateE164(phone);
    if (!valid) {
      res.status(400).json({ error: "Invalid phone format" });
      return;
    }

    const stored = await getOtp(normalized);
    if (!stored || stored.otp !== otp) {
      if (stored) {
        const attempts = await incrementOtpAttempts(normalized);
        if (attempts >= 3) {
          await deleteOtp(normalized);
          res.status(429).json({
            error: "too_many_attempts",
            message: "OTP invalidated after 3 failed attempts",
          });
          return;
        }
      }
      res.status(401).json({ error: "Invalid or expired OTP" });
      return;
    }

    await deleteOtp(normalized);

    const db = getDb();

    const existing = await db.query.users.findFirst({
      where: eq(schema.users.phone, normalized),
    });

    if (existing) {
      res.status(409).json({ error: "Phone already registered" });
      return;
    }

    const now = new Date();

    const result = await db.transaction(async (tx) => {
      const [newUser] = await tx
        .insert(schema.users)
        .values({
          phone: normalized,
          name: name.trim(),
          pinHash: "",
          kycStatus: "pending",
          themePref: "dark",
          language: "en-IN",
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      await tx.insert(schema.wallets).values({
        userId: newUser.id,
        balancePaise: 0,
        upiLitePaise: 0,
        createdAt: now,
        updatedAt: now,
      });

      const [device] = await tx
        .insert(schema.devices)
        .values({
          userId: newUser.id,
          deviceFingerprint: device_fingerprint,
          pushToken: push_token ?? null,
          isTrusted: false,
          lastSeenAt: now,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      const refreshToken = generateRefreshToken();
      const refreshTokenHash = hashToken(refreshToken);
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await tx.insert(schema.sessions).values({
        userId: newUser.id,
        deviceId: device.id,
        refreshTokenHash,
        expiresAt,
        createdAt: now,
        updatedAt: now,
      });

      const accessToken = signJwt({
        sub: newUser.id,
        sid: device.id,
        did: device.id,
      });

      return { user: newUser, accessToken, refreshToken };
    });

    res.status(201).json({
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
      user: toUserJson(result.user),
    });
  } catch (error) {
    logger.error({ err: error }, "Registration failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/refresh
router.post("/auth/refresh", validate({ schema: refreshSchema, source: "body" }), async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.body;

    const db = getDb();
    const tokenHash = hashToken(refresh_token);

    const session = await db.query.sessions.findFirst({
      where: eq(schema.sessions.refreshTokenHash, tokenHash),
    });

    if (!session) {
      res.status(401).json({ error: "Invalid refresh token" });
      return;
    }

    if (session.revokedAt) {
      res.status(401).json({ error: "Session has been revoked" });
      return;
    }

    const expiresAt = session.expiresAt instanceof Date ? session.expiresAt.getTime() : new Date(session.expiresAt).getTime();
    if (expiresAt < Date.now()) {
      res.status(401).json({ error: "Session has expired" });
      return;
    }

    const newRefreshToken = generateRefreshToken();
    const newRefreshTokenHash = hashToken(newRefreshToken);
    const now = new Date();
    const newExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await db
      .update(schema.sessions)
      .set({
        refreshTokenHash: newRefreshTokenHash,
        expiresAt: newExpiresAt,
        updatedAt: now,
      })
      .where(eq(schema.sessions.id, session.id));

    const accessToken = signJwt({
      sub: session.userId,
      sid: session.id,
      did: session.deviceId,
    });

    res.json({ access_token: accessToken, refresh_token: newRefreshToken });
  } catch (error) {
    logger.error({ err: error }, "Token refresh failed");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /auth/logout
router.post("/auth/logout", requireAuth, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const sessionId = req.user!.sessionId;

    await db
      .update(schema.sessions)
      .set({ revokedAt: new Date() })
      .where(eq(schema.sessions.id, sessionId));

    res.json({ success: true });
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
      const userId = req.user!.userId;
      const { name, email, theme_pref, notifications_enabled } = req.body;

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (name !== undefined) updates.name = name;
      if (email !== undefined) updates.email = email;
      if (theme_pref !== undefined) updates.themePref = theme_pref;
      if (notifications_enabled !== undefined) updates.notificationsEnabled = notifications_enabled;

      const [updated] = await db
        .update(schema.users)
        .set(updates)
        .where(eq(schema.users.id, userId))
        .returning();

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
      const { device_fingerprint, push_token } = req.body;

      const deviceId = await findOrCreateDevice(userId, device_fingerprint, push_token);
      const device = await db.query.devices.findFirst({
        where: eq(schema.devices.id, deviceId),
      });

      res.json({ device });
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
      const userId = req.user!.userId;
      const deviceId = paramId(req);

      const device = await db.query.devices.findFirst({
        where: and(
          eq(schema.devices.id, deviceId),
          eq(schema.devices.userId, userId),
          isNull(schema.devices.deletedAt),
        ),
      });

      if (!device) {
        res.status(404).json({ error: "Device not found" });
        return;
      }

      await db
        .update(schema.devices)
        .set({ deletedAt: new Date() })
        .where(eq(schema.devices.id, deviceId));

      res.json({ success: true });
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
    const userId = req.user!.userId;

    const userDevices = await db.query.devices.findMany({
      where: and(
        eq(schema.devices.userId, userId),
        isNull(schema.devices.deletedAt),
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
    const userId = req.user!.userId;

    const userSessions = await db.query.sessions.findMany({
      where: and(
        eq(schema.sessions.userId, userId),
        isNull(schema.sessions.revokedAt),
      ),
    });

    res.json({ sessions: userSessions });
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
      const userId = req.user!.userId;
      const { session_id } = req.body;

      const session = await db.query.sessions.findFirst({
        where: eq(schema.sessions.id, session_id),
      });

      if (!session || session.userId !== userId) {
        res.status(404).json({ error: "Session not found" });
        return;
      }

      await db
        .update(schema.sessions)
        .set({ revokedAt: new Date() })
        .where(eq(schema.sessions.id, session_id));

      res.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, "Failed to revoke session");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
