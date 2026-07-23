import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index";

const { Pool } = pg;

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _pool: pg.Pool | null = null;

export function getDb() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL environment variable is required. " +
        "Set it to a PostgreSQL connection string (e.g., postgresql://user:pass@localhost:5432/vault).",
      );
    }
    const sslEnabled = url.includes("render.com") || url.includes("dpg-");
    const connStr = sslEnabled ? `${url}?sslmode=no-verify` : url;
    _pool = new Pool({
      connectionString: connStr,
      ...(sslEnabled ? { ssl: { rejectUnauthorized: false } } : {}),
    });
    _db = drizzle(_pool, { schema });
  }
  return _db;
}

export function getPool() {
  if (!_pool) {
    getDb();
  }
  return _pool!;
}

export async function closeDb(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _db = null;
  }
}

export { schema };
export type AppDatabase = ReturnType<typeof getDb>;
