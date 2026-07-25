import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Production-ready CORS — allow known origins or comma-separated list from env
const allowedOrigins = (process.env.CORS_ORIGINS ?? "http://localhost:5173,http://localhost:3001,http://localhost:8081,http://127.0.0.1:8081")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, same-origin)
      if (!origin || allowedOrigins.includes("*")) {
        callback(null, true);
        return;
      }
      callback(null, allowedOrigins.includes(origin));
    },
    credentials: true,
  }),
);

// Trust proxy — required for accurate rate limiting behind Render/AWS/nginx
app.set("trust proxy", true);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global rate limit
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "too_many_requests" },
  }),
);

// Root health check — required by Railway
app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "vault-api" });
});

app.use("/api", router);

export default app;
