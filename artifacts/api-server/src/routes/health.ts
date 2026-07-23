import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  const hasDbUrl = !!process.env.DATABASE_URL;
  const hasApiKey = !!process.env.IRCTC_API_KEY;
  const hasJwtSecret = !!process.env.JWT_SECRET;

  let dbOk = false;
  if (hasDbUrl) {
    try {
      const { Pool } = await import("pg");
      const url = process.env.DATABASE_URL!;
      const pool = new Pool({
        connectionString: url,
        connectionTimeoutMillis: 5000,
        ssl: url.includes("render.com") || url.includes("dpg-") ? { rejectUnauthorized: false } : undefined,
      });
      const result = await pool.query("SELECT 1 as ok");
      dbOk = result.rows[0]?.ok === 1;
      await pool.end();
    } catch (e: any) {
      dbOk = false;
    }
  }

  res.json({
    status: "ok",
    env: { DATABASE_URL: hasDbUrl, IRCTC_API_KEY: hasApiKey, JWT_SECRET: hasJwtSecret },
    db: dbOk ? "connected" : "not connected",
  });
});

export default router;
