import { Router, type IRouter } from "express";
import { getPool } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  const hasDbUrl = !!process.env.DATABASE_URL;
  const hasApiKey = !!process.env.IRCTC_API_KEY;
  const hasJwtSecret = !!process.env.JWT_SECRET;

  let dbOk = false;
  let dbError = null;
  if (hasDbUrl) {
    try {
      const pool = getPool();
      const result = await pool.query("SELECT 1 as ok");
      dbOk = result.rows[0]?.ok === 1;
    } catch (e: any) {
      dbOk = false;
      dbError = e.message || String(e);
    }
  }

  res.json({
    status: "ok",
    env: { DATABASE_URL: hasDbUrl, IRCTC_API_KEY: hasApiKey, JWT_SECRET: hasJwtSecret },
    db: dbOk ? "connected" : "not connected",
    dbError,
  });
});

export default router;
