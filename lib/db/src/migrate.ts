import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema/index";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error(
    "DATABASE_URL environment variable is required.\n" +
      "Set it to a PostgreSQL connection string (e.g., postgresql://user:pass@localhost:5432/vault).",
  );
  process.exit(1);
}

const migrationsFolder = path.join(__dirname, "..", "migrations");

async function runMigrations() {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log(`Running migrations from ${migrationsFolder}`);

  try {
    await migrate(db, { migrationsFolder });
    console.log("Migrations completed successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
