import Redis from "ioredis";
import { logger } from "./logger";

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error(
    "REDIS_URL environment variable is required for Redis operations. " +
    "Set it in your .env file or environment.",
  );
}

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 3) return null;
    return Math.min(times * 200, 2000);
  },
  lazyConnect: true,
});

redis.on("connect", () => {
  logger.info("[redis] connected");
});

redis.on("error", (err) => {
  logger.error({ err: err.message }, "[redis] connection error");
});

export async function connectRedis(): Promise<void> {
  try {
    await redis.connect();
  } catch (err) {
    logger.error({ err }, "[redis] failed to connect");
  }
}

export async function setOtp(
  phone: string,
  otp: string,
  ttlSeconds: number,
): Promise<void> {
  await redis.set(
    `otp:${phone}`,
    JSON.stringify({ otp, attempts: 0 }),
    "EX",
    ttlSeconds,
  );
}

export async function getOtp(phone: string): Promise<{
  otp: string;
  attempts: number;
} | null> {
  const data = await redis.get(`otp:${phone}`);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function incrementOtpAttempts(phone: string): Promise<number> {
  const data = await getOtp(phone);
  if (!data) return 0;
  const newAttempts = data.attempts + 1;
  const ttl = await redis.ttl(`otp:${phone}`);
  await redis.set(
    `otp:${phone}`,
    JSON.stringify({ ...data, attempts: newAttempts }),
    "EX",
    ttl > 0 ? ttl : 300,
  );
  return newAttempts;
}

export async function deleteOtp(phone: string): Promise<void> {
  await redis.del(`otp:${phone}`);
}

export async function pingRedis(): Promise<boolean> {
  try {
    const result = await redis.ping();
    return result === "PONG";
  } catch {
    return false;
  }
}

export { redis };
