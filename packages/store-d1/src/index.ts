import type { Store } from "@symbolon/core";
import { MIGRATIONS_TABLE, pendingMigrations } from "@symbolon/store";

/** The part of a D1 prepared statement this adapter uses. Structural, so no Workers types are needed. */
export interface D1PreparedStatementLike {
  /** Binds the statement's `?` parameters. */
  bind(...values: unknown[]): D1PreparedStatementLike;
  /** Runs the statement and returns its first row, or `null`. */
  first<Row = Record<string, unknown>>(): Promise<Row | null>;
  /** Runs the statement and returns every row. */
  all<Row = Record<string, unknown>>(): Promise<{ results: Row[] }>;
  /** Runs the statement for its effect. */
  run(): Promise<unknown>;
}

/** The part of a D1 binding this adapter uses: a Worker's `env.DB` satisfies it. */
export interface D1DatabaseLike {
  /** Prepares one statement. */
  prepare(query: string): D1PreparedStatementLike;
  /** Runs statements in one implicit transaction: all of them apply, or none does. */
  batch(statements: D1PreparedStatementLike[]): Promise<unknown[]>;
}

/**
 * Opens a store on a Cloudflare D1 database.
 *
 * @param db - The D1 binding, such as `env.DB`.
 * @returns The store. Call `migrate()` before using it.
 */
export function createD1Store(db: D1DatabaseLike): Store {
  return {
    async migrate() {
      await db
        .prepare(`CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (id TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)`)
        .run();
      const applied = await db.prepare(`SELECT id FROM ${MIGRATIONS_TABLE}`).all<{ id: string }>();
      // D1 has no interactive transactions, so each migration is one batch: its statements and the row that
      // records it apply together. Two isolates migrating at once both try to insert the same id, and the
      // primary key rolls back the second batch whole.
      const batches = pendingMigrations(applied.results.map((row) => row.id)).map((migration) => [
        ...migration.sqlite.map((statement) => db.prepare(statement)),
        db
          .prepare(`INSERT INTO ${MIGRATIONS_TABLE} (id, applied_at) VALUES (?, ?)`)
          .bind(migration.id, Math.floor(Date.now() / 1000)),
      ]);
      for (const batch of batches) {
        // oxlint-disable-next-line no-await-in-loop -- migrations apply in order.
        await db.batch(batch);
      }
    },
    async ping() {
      await db.prepare("SELECT 1").first();
    },
    settings: {
      async get(key) {
        const row = await db.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first<{ value: string }>();
        return row === null ? undefined : JSON.parse(row.value);
      },
      async set(key, value) {
        await db
          .prepare(
            "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
          )
          .bind(key, JSON.stringify(value))
          .run();
      },
    },
    async close() {
      // A D1 binding has no connection to release.
    },
  };
}
