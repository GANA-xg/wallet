import "dotenv/config";
import app from "./app";
import { logger } from "./lib/logger";

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

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
