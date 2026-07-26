import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { getPool, getDb } from "@workspace/db";
import { initSocketServer } from "./lib/socketServer";
import { connectRedis } from "./lib/redis";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const httpServer = createServer(app);

const port = (() => {
  const raw = process.env.PORT;
  if (!raw) {
    logger.warn("PORT not set, defaulting to 3001");
    return 3001;
  }
  const n = Number(raw);
  if (Number.isNaN(n) || n <= 0) {
    logger.warn({ port: raw }, "Invalid PORT value, defaulting to 3001");
    return 3001;
  }
  return n;
})();

async function runMigrations() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    logger.warn("DATABASE_URL not set — skipping migrations");
    return;
  }
  try {
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const pool = getPool();
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const db = drizzle(pool);
    const migrationsFolder = path.join(__dirname, "..", "..", "lib", "db", "migrations");
    await migrate(db, { migrationsFolder });
    logger.info("Database migrations completed");
  } catch (error) {
    logger.error({ err: error }, "Database migration failed — server will start but auth may not work");
  }
}

async function start() {
  await runMigrations();

  // Initialize Redis (best-effort)
  try {
    await connectRedis();
  } catch (err) {
    logger.warn({ err }, "Redis connection failed — OTP will use in-memory fallback");
  }

  // Initialize Socket.IO
  initSocketServer(httpServer);

  httpServer.listen(port, () => {
    logger.info({ port }, "Server listening");
  });
}

start();
