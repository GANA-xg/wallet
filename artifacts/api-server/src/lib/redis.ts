import Redis from "ioredis";
import { logger } from "./logger";

let redis: Redis | null = null;
let _available = false;

const redisUrl = process.env.REDIS_URL;

function getClient(): Redis | null {
  if (!redisUrl) return null;
  if (!redis) {
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    redis.on("connect", () => {
      logger.info("[redis] connected");
      _available = true;
    });

    redis.on("error", (err) => {
      logger.error({ err: err.message }, "[redis] connection error");
      _available = false;
    });
  }
  return redis;
}

export async function connectRedis(): Promise<void> {
  const client = getClient();
  if (!client) {
    logger.warn("[redis] REDIS_URL not set — OTP will use in-memory fallback");
    return;
  }
  try {
    await client.connect();
  } catch (err) {
    logger.error({ err }, "[redis] failed to connect");
  }
}

export async function setOtp(
  phone: string,
  otp: string,
  ttlSeconds: number,
): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    await client.set(
      `otp:${phone}`,
      JSON.stringify({ otp, attempts: 0 }),
      "EX",
      ttlSeconds,
    );
  } catch {}
}

export async function getOtp(phone: string): Promise<{
  otp: string;
  attempts: number;
} | null> {
  const client = getClient();
  if (!client) return null;
  try {
    const data = await client.get(`otp:${phone}`);
    if (!data) return null;
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function incrementOtpAttempts(phone: string): Promise<number> {
  const data = await getOtp(phone);
  if (!data) return 0;
  const newAttempts = data.attempts + 1;
  const client = getClient();
  if (!client) return newAttempts;
  try {
    const ttl = await client.ttl(`otp:${phone}`);
    await client.set(
      `otp:${phone}`,
      JSON.stringify({ ...data, attempts: newAttempts }),
      "EX",
      ttl > 0 ? ttl : 300,
    );
  } catch {}
  return newAttempts;
}

export async function deleteOtp(phone: string): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    await client.del(`otp:${phone}`);
  } catch {}
}

export async function pingRedis(): Promise<boolean> {
  if (!_available || !redis) return false;
  try {
    const result = await redis.ping();
    return result === "PONG";
  } catch {
    return false;
  }
}

export function isRedisAvailable(): boolean {
  return _available;
}
