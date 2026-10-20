import { DatabaseSync } from "node:sqlite";

import type { Store } from "@symbolon/core";
import { MIGRATIONS_TABLE, pendingMigrations } from "@symbolon/store";

/** Options for {@link createSqliteStore}. */
export interface SqliteStoreOptions {
  /** The database file, created when missing, or `:memory:` for a database that lives as long as the store. */
  readonly path: string;
}

/**
 * Opens a store on a SQLite database file, through Node.js's built-in `node:sqlite`.
 *
 * @param options - Where the database lives.
 * @returns The store. Call `migrate()` before using it.
 * @throws {Error} When the file cannot be opened or created.
 */
export function createSqliteStore(options: SqliteStoreOptions): Store {
  const db = new DatabaseSync(options.path);
  // WAL lets the health check and readers run while a write is in progress; the busy timeout makes a
  // second writer wait for the lock instead of failing at once.
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA busy_timeout = 5000");

  const transaction = (work: () => void): void => {
    // IMMEDIATE takes the write lock up front, so two processes migrating one file run one after the other.
    db.exec("BEGIN IMMEDIATE");
    try {
      work();
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  };

  return {
    async migrate() {
      transaction(() => {
        db.exec(`CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (id TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)`);
        const applied = db.prepare(`SELECT id FROM ${MIGRATIONS_TABLE}`).all();
        const record = db.prepare(`INSERT INTO ${MIGRATIONS_TABLE} (id, applied_at) VALUES (?, ?)`);
        for (const migration of pendingMigrations(applied.map((row) => String(row["id"])))) {
          for (const statement of migration.sqlite) {
            db.exec(statement);
          }
          record.run(migration.id, Math.floor(Date.now() / 1000));
        }
      });
    },
    async ping() {
      db.prepare("SELECT 1").get();
    },
    settings: {
      async get(key) {
        const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
        return row === undefined ? undefined : JSON.parse(String(row["value"]));
      },
      async set(key, value) {
        db.prepare(
          "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
        ).run(key, JSON.stringify(value));
      },
    },
    async close() {
      db.close();
    },
  };
}
