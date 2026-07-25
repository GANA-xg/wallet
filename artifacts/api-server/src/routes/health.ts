import { Router, type IRouter, type Request, type Response } from "express";
import { getPool } from "@workspace/db";
import { pingRedis } from "../lib/redis";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/healthz", async (_req: Request, res: Response) => {
  let dbStatus: "ok" | "error" = "ok";
  let redisStatus: "ok" | "error" = "ok";

  try {
    const pool = getPool();
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
  } catch (err) {
    logger.error({ err }, "Health check — DB check failed");
    dbStatus = "error";
  }

  try {
    const ping = await pingRedis();
    if (!ping) redisStatus = "error";
  } catch {
    redisStatus = "error";
  }

  const allOk = dbStatus === "ok" && redisStatus === "ok";

  res.status(allOk ? 200 : 503).json({
    status: allOk ? "ok" : "degraded",
    db: dbStatus,
    redis: redisStatus,
    uptime: process.uptime(),
  });
});

export default router;
