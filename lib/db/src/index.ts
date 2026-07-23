import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index";

const { Pool } = pg;

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _pool: pg.Pool | null = null;

function createPool(url: string): pg.Pool {
  const sslEnabled = url.includes("render.com") || url.includes("dpg-");
  if (sslEnabled) {
    const parsed = new URL(url);
    return new Pool({
      host: parsed.hostname,
      port: Number(parsed.port) || 5432,
      database: parsed.pathname.slice(1),
      user: parsed.username,
      password: parsed.password,
      ssl: { rejectUnauthorized: false },
    });
  }
  return new Pool({ connectionString: url });
}

export function getDb() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL environment variable is required. " +
        "Set it to a PostgreSQL connection string (e.g., postgresql://user:pass@localhost:5432/vault).",
      );
    }
    _pool = createPool(url);
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
