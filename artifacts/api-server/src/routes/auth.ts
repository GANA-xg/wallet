import { Router, type IRouter, type Request, type Response } from "express";
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

interface UserRecord {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  kycStatus: string;
  twoFactorEnabled: boolean;
  biometricEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface SessionRecord {
  id: string;
  userId: string;
  deviceId: string | null;
  refreshTokenHash: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  lastActiveAt: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

interface DeviceRecord {
  id: string;
  userId: string;
  deviceName: string | null;
  deviceIdentifier: string;
  pushToken: string | null;
  lastUsedAt: string;
  enrolledAt: string;
  revokedAt: string | null;
}

// In-memory stores
const users = new Map<string, UserRecord>();
const sessions = new Map<string, SessionRecord>();
const devices = new Map<string, DeviceRecord>();
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

function paramId(req: Request): string {
  const id = req.params["id"];
  return Array.isArray(id) ? id[0] : id;
}

const router: IRouter = Router();

function toUserJson(user: UserRecord) {
  return {
    id: user.id,
    phone: user.phone,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    kycStatus: user.kycStatus,
    twoFactorEnabled: user.twoFactorEnabled,
    biometricEnabled: user.biometricEnabled,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function toSessionJson(session: SessionRecord) {
  return {
    id: session.id,
    userId: session.userId,
    deviceId: session.deviceId,
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    lastActiveAt: session.lastActiveAt,
    expiresAt: session.expiresAt,
    revokedAt: session.revokedAt,
    createdAt: session.createdAt,
  };
}

function findOrCreateUser(phone: string): UserRecord {
  for (const user of users.values()) {
    if (user.phone === phone) return user;
  }

  const now = new Date().toISOString();
  const newUser: UserRecord = {
    id: generateId(),
    phone,
    name: null,
    email: null,
    avatarUrl: null,
    kycStatus: "pending",
    twoFactorEnabled: false,
    biometricEnabled: true,
    createdAt: now,
    updatedAt: now,
  };
  users.set(newUser.id, newUser);
  return newUser;
}

function issueTokens(userId: string, deviceId: string | null, ipAddress: string | null, userAgent: string | null) {
  const sessionId = generateId();
  const now = Date.now();
  const sessionExpiry = new Date(now + getSessionTtl()).toISOString();

  const refreshTokenValue = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshTokenValue);

  const session: SessionRecord = {
    id: sessionId,
    userId,
    deviceId,
    refreshTokenHash,
    ipAddress,
    userAgent,
    lastActiveAt: new Date(now).toISOString(),
    expiresAt: sessionExpiry,
    revokedAt: null,
    createdAt: new Date(now).toISOString(),
  };
  sessions.set(sessionId, session);

  const accessToken = signJwt({
    sub: userId,
    sid: sessionId,
    did: deviceId,
  });

  return { accessToken, refreshToken: refreshTokenValue, session };
}

function validateRefreshToken(refreshToken: string): { sessionId: string; userId: string } | null {
  const tokenHash = hashToken(refreshToken);

  for (const [sessionId, session] of sessions) {
    if (session.refreshTokenHash === tokenHash && !session.revokedAt) {
      const expiresAt = new Date(session.expiresAt).getTime();
      if (expiresAt < Date.now()) {
        return null;
      }
      return { sessionId, userId: session.userId };
    }
  }

  return null;
}

function rotateRefreshToken(sessionId: string): string | null {
  const session = sessions.get(sessionId);
  if (!session || session.revokedAt) return null;

  const newRefreshToken = generateRefreshToken();
  session.refreshTokenHash = hashToken(newRefreshToken);
  session.lastActiveAt = new Date().toISOString();
  sessions.set(sessionId, session);

  return newRefreshToken;
}

function cleanExpired(): void {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (new Date(session.expiresAt).getTime() < now || session.revokedAt) {
      sessions.delete(id);
    }
  }
  for (const [phone, entry] of otpStore) {
    if (entry.expiresAt < now) {
      otpStore.delete(phone);
    }
  }
}

// POST /auth/otp/send
router.post("/auth/otp/send", (req: Request, res: Response) => {
  const { phone } = req.body as { phone?: string };
  if (!phone || phone.length < 10) {
    res.status(400).json({ error: "Valid phone number is required" });
    return;
  }

  const otp = "000000";
  otpStore.set(phone, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });

  cleanExpired();

  if (process.env.NODE_ENV !== "production") {
    logger.info({ phone }, "OTP sent (dev mode)");
  }
  res.json({ message: "OTP sent successfully", expiresIn: 300 });
});

// POST /auth/otp/verify
router.post("/auth/otp/verify", (req: Request, res: Response) => {
  const { phone, otp, deviceName, deviceIdentifier } = req.body as {
    phone?: string;
    otp?: string;
    deviceName?: string;
    deviceIdentifier?: string;
  };

  if (!phone || !otp) {
    res.status(400).json({ error: "Phone and OTP are required" });
    return;
  }

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
  cleanExpired();

  const user = findOrCreateUser(phone);

  let deviceId: string | null = null;
  if (deviceIdentifier) {
    const existingDevice = Array.from(devices.values()).find(
      (d) => d.deviceIdentifier === deviceIdentifier && d.userId === user.id,
    );
    if (existingDevice) {
      deviceId = existingDevice.id;
      existingDevice.lastUsedAt = new Date().toISOString();
      devices.set(existingDevice.id, existingDevice);
    } else {
      deviceId = generateId();
      const now = new Date().toISOString();
      devices.set(deviceId, {
        id: deviceId,
        userId: user.id,
        deviceName: deviceName ?? null,
        deviceIdentifier,
        pushToken: null,
        lastUsedAt: now,
        enrolledAt: now,
        revokedAt: null,
      });
    }
  }

  const tokens = issueTokens(user.id, deviceId, req.ip ?? null, req.headers["user-agent"] ?? null);

  res.json({
    user: toUserJson(user),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
});

// POST /auth/refresh
router.post("/auth/refresh", (req: Request, res: Response) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) {
    res.status(400).json({ error: "Refresh token is required" });
    return;
  }

  const result = validateRefreshToken(refreshToken);
  if (!result) {
    res.status(401).json({ error: "Invalid or expired refresh token" });
    return;
  }

  const newRefreshToken = rotateRefreshToken(result.sessionId);
  if (!newRefreshToken) {
    res.status(401).json({ error: "Session has been revoked" });
    return;
  }

  const session = sessions.get(result.sessionId)!;
  const accessToken = signJwt({
    sub: result.userId,
    sid: result.sessionId,
    did: session.deviceId,
  });

  res.json({ accessToken, refreshToken: newRefreshToken });
});

// POST /auth/logout
router.post("/auth/logout", requireAuth, (req: Request, res: Response) => {
  const session = sessions.get(req.user!.sessionId);
  if (session) {
    session.revokedAt = new Date().toISOString();
    sessions.set(req.user!.sessionId, session);
  }

  cleanExpired();
  res.json({ message: "Logged out successfully" });
});

// GET /auth/me
router.get("/auth/me", requireAuth, (req: Request, res: Response) => {
  const user = users.get(req.user!.userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const session = sessions.get(req.user!.sessionId);
  if (!session || session.revokedAt) {
    res.status(401).json({ error: "Session has been revoked" });
    return;
  }

  session.lastActiveAt = new Date().toISOString();
  sessions.set(req.user!.sessionId, session);

  res.json({ user: toUserJson(user) });
});

// POST /auth/devices/register
router.post("/auth/devices/register", requireAuth, (req: Request, res: Response) => {
  const { deviceName, deviceIdentifier, pushToken } = req.body as {
    deviceName?: string;
    deviceIdentifier?: string;
    pushToken?: string;
  };

  if (!deviceIdentifier) {
    res.status(400).json({ error: "deviceIdentifier is required" });
    return;
  }

  const userId = req.user!.userId;

  const existing = Array.from(devices.values()).find(
    (d) => d.deviceIdentifier === deviceIdentifier && d.userId === userId,
  );
  if (existing && !existing.revokedAt) {
    existing.deviceName = deviceName ?? existing.deviceName;
    existing.pushToken = pushToken ?? existing.pushToken;
    existing.lastUsedAt = new Date().toISOString();
    devices.set(existing.id, existing);
    res.json({ device: existing });
    return;
  }

  const now = new Date().toISOString();
  const device: DeviceRecord = {
    id: generateId(),
    userId,
    deviceName: deviceName ?? null,
    deviceIdentifier,
    pushToken: pushToken ?? null,
    lastUsedAt: now,
    enrolledAt: now,
    revokedAt: null,
  };
  devices.set(device.id, device);

  res.status(201).json({ device });
});

// DELETE /auth/devices/:id
router.delete("/auth/devices/:id", requireAuth, (req: Request, res: Response) => {
  const deviceId = paramId(req);
  const device = devices.get(deviceId);

  if (!device || device.userId !== req.user!.userId) {
    res.status(404).json({ error: "Device not found" });
    return;
  }

  device.revokedAt = new Date().toISOString();
  devices.set(deviceId, device);

  for (const [id, session] of sessions) {
    if (session.deviceId === deviceId && !session.revokedAt) {
      session.revokedAt = new Date().toISOString();
      sessions.set(id, session);
    }
  }

  cleanExpired();
  res.json({ message: "Device removed" });
});

// GET /auth/devices
router.get("/auth/devices", requireAuth, (req: Request, res: Response) => {
  const userDevices = Array.from(devices.values()).filter(
    (d) => d.userId === req.user!.userId && !d.revokedAt,
  );
  res.json({ devices: userDevices });
});

// GET /auth/sessions
router.get("/auth/sessions", requireAuth, (req: Request, res: Response) => {
  const userSessions = Array.from(sessions.values())
    .filter((s) => s.userId === req.user!.userId && !s.revokedAt)
    .map(toSessionJson);

  res.json({ sessions: userSessions });
});

// POST /auth/sessions/revoke
router.post("/auth/sessions/revoke", requireAuth, (req: Request, res: Response) => {
  const { sessionId } = req.body as { sessionId?: string };
  if (!sessionId) {
    res.status(400).json({ error: "sessionId is required" });
    return;
  }

  const session = sessions.get(sessionId);
  if (!session || session.userId !== req.user!.userId) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  session.revokedAt = new Date().toISOString();
  sessions.set(sessionId, session);

  cleanExpired();
  res.json({ message: "Session revoked" });
});

export default router;
