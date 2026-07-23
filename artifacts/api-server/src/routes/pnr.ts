import { Router, type IRouter, type Request, type Response } from "express";
import { configure, checkPNRStatus } from "railkit";
import { logger } from "../lib/logger";
import { optionalAuth } from "../middleware/auth";

const router: IRouter = Router();

const apiKey = process.env.IRCTC_API_KEY;
if (apiKey) {
  configure(apiKey);
} else {
  logger.warn("IRCTC_API_KEY not set — PNR lookup will return 503");
}

router.get("/pnr/:pnr", optionalAuth, async (req: Request, res: Response) => {
  const raw = req.params["pnr"];
  const pnr = Array.isArray(raw) ? raw[0] : raw;

  if (!/^\d{10}$/.test(pnr)) {
    res.status(400).json({ error: "Invalid PNR format. Must be 10 digits." });
    return;
  }

  if (!apiKey) {
    res.status(503).json({ error: "PNR lookup service is not configured." });
    return;
  }

  try {
    const result = await checkPNRStatus(pnr);
    logger.info({ pnr, railkitKeys: result ? Object.keys(result) : null }, "Raw RailKit response envelope");
    if (result?.data) {
      logger.info(
        {
          pnr,
          dataKeys: Object.keys(result.data),
          trainKeys: result.data.train ? Object.keys(result.data.train) : null,
          journeyKeys: result.data.journey ? Object.keys(result.data.journey) : null,
          passengersCount: result.data.passengers?.length ?? 0,
          firstPassengerKeys: result.data.passengers?.[0] ? Object.keys(result.data.passengers[0]) : null,
        },
        "RailKit data structure",
      );
    }
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ err: error, pnr }, "PNR lookup failed");
    res.status(502).json({ error: `PNR lookup failed: ${message}` });
  }
});

export default router;
