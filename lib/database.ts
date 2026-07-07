import { getDb } from "@/lib/db";
import { inWorkers } from "@/lib/runtime";

// Shared async data-access layer. Local dev + tests use better-sqlite3 (fast,
// synchronous) via SqliteAdapter; on Cloudflare we use the D1 binding. Queries
// in lib/queries.ts etc. talk to this interface, never the driver directly.

export type SqlParams = unknown[] | Record<string, unknown> | undefined;

export interface DbAdapter {
  all<T = Record<string, unknown>>(sql: string, params?: SqlParams): Promise<T[]>;
  get<T = Record<string, unknown>>(
    sql: string,
    params?: SqlParams
  ): Promise<T | undefined>;
  run(
    sql: string,
    params?: SqlParams
  ): Promise<{ changes: number; lastInsertRowid: number }>;
}

// ---- Local: better-sqlite3 -------------------------------------------------

function callSqlite<T>(
  fn: (...args: unknown[]) => T,
  params: SqlParams
): T {
  if (params === undefined) return fn();
  return Array.isArray(params) ? fn(...params) : fn(params);
}

class SqliteAdapter implements DbAdapter {
  async all<T>(sql: string, params?: SqlParams): Promise<T[]> {
    const stmt = getDb().prepare(sql);
    return callSqlite((...a) => stmt.all(...a), params) as T[];
  }
  async get<T>(sql: string, params?: SqlParams): Promise<T | undefined> {
    const stmt = getDb().prepare(sql);
    return (callSqlite((...a) => stmt.get(...a), params) as T) ?? undefined;
  }
  async run(sql: string, params?: SqlParams) {
    const stmt = getDb().prepare(sql);
    const info = callSqlite((...a) => stmt.run(...a), params) as {
      changes: number;
      lastInsertRowid: number | bigint;
    };
    return { changes: info.changes, lastInsertRowid: Number(info.lastInsertRowid) };
  }
}

// ---- Cloudflare: D1 --------------------------------------------------------

interface D1Stmt {
  bind(...values: unknown[]): D1Stmt;
  all<T>(): Promise<{ results: T[] }>;
  first<T>(): Promise<T | null>;
  run(): Promise<{ meta: { changes?: number; last_row_id?: number } }>;
}
interface D1Like {
  prepare(sql: string): D1Stmt;
}

// D1 only binds positional `?`, so translate any @named / :named params.
function toPositional(sql: string, params: SqlParams): {
  sql: string;
  values: unknown[];
} {
  if (params === undefined) return { sql, values: [] };
  if (Array.isArray(params)) return { sql, values: params };
  const values: unknown[] = [];
  const obj = params;
  const text = sql.replace(/[@:$]([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, name: string) => {
    values.push(obj[name]);
    return "?";
  });
  return { sql: text, values };
}

class D1Adapter implements DbAdapter {
  constructor(private db: D1Like) {}
  private prep(sql: string, params: SqlParams): D1Stmt {
    const { sql: text, values } = toPositional(sql, params);
    const stmt = this.db.prepare(text);
    return values.length ? stmt.bind(...values) : stmt;
  }
  async all<T>(sql: string, params?: SqlParams): Promise<T[]> {
    return (await this.prep(sql, params).all<T>()).results;
  }
  async get<T>(sql: string, params?: SqlParams): Promise<T | undefined> {
    return (await this.prep(sql, params).first<T>()) ?? undefined;
  }
  async run(sql: string, params?: SqlParams) {
    const r = await this.prep(sql, params).run();
    return {
      changes: r.meta.changes ?? 0,
      lastInsertRowid: r.meta.last_row_id ?? 0,
    };
  }
}

// ---- Selection -------------------------------------------------------------

let adapterPromise: Promise<DbAdapter> | null = null;

async function resolveD1(): Promise<D1Like | null> {
  if (!inWorkers()) return null; // local dev/tests → SQLite
  try {
    const mod = await import("@opennextjs/cloudflare");
    const ctx = await mod.getCloudflareContext({ async: true });
    const env = (ctx as unknown as { env?: Record<string, unknown> })?.env;
    return ((env?.DB as D1Like) ?? null) || null;
  } catch {
    return null;
  }
}

/** Returns the active database adapter (D1 on Cloudflare, SQLite locally). */
export function db(): Promise<DbAdapter> {
  if (!adapterPromise) {
    adapterPromise = resolveD1().then((d1) =>
      d1 ? new D1Adapter(d1) : new SqliteAdapter()
    );
  }
  return adapterPromise;
}
