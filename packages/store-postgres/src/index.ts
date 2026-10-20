import type { Store } from "@symbolon/core";
import { MIGRATIONS_TABLE, pendingMigrations } from "@symbolon/store";
import postgres from "postgres";

/** Options for {@link createPostgresStore}. */
export interface PostgresStoreOptions {
  /** A connection URL, `postgres://user:password@host:5432/database`. */
  readonly url: string;
  /**
   * The schema Symbolon's tables live in, set as the connection's `search_path`.
   *
   * @defaultValue the server's default, normally `public`
   */
  readonly schema?: string;
}

// An arbitrary constant: the key of the advisory lock that lets one process migrate at a time.
const MIGRATION_LOCK_KEY = 0x5359_4d42;

/**
 * Opens a store on a PostgreSQL database.
 *
 * @param options - Where the database is.
 * @returns The store. Call `migrate()` before using it. Connections open lazily, on the first query.
 */
export function createPostgresStore(options: PostgresStoreOptions): Store {
  const sql = postgres(options.url, {
    // `CREATE TABLE IF NOT EXISTS` raises a notice that the driver would print to the console.
    onnotice: () => {},
    ...(options.schema === undefined ? {} : { connection: { search_path: options.schema } }),
  });

  return {
    async migrate() {
      await sql.begin(async (tx) => {
        await tx`SELECT pg_advisory_xact_lock(${MIGRATION_LOCK_KEY})`;
        await tx.unsafe(
          `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (id TEXT PRIMARY KEY, applied_at BIGINT NOT NULL)`,
        );
        const applied = await tx.unsafe<{ id: string }[]>(`SELECT id FROM ${MIGRATIONS_TABLE}`);
        for (const migration of pendingMigrations(applied.map((row) => row.id))) {
          for (const statement of migration.postgres) {
            // oxlint-disable-next-line no-await-in-loop -- statements apply in order, inside one transaction.
            await tx.unsafe(statement);
          }
          // oxlint-disable-next-line no-await-in-loop -- recorded in the same transaction as its statements.
          await tx.unsafe(`INSERT INTO ${MIGRATIONS_TABLE} (id, applied_at) VALUES ($1, $2)`, [
            migration.id,
            Math.floor(Date.now() / 1000),
          ]);
        }
      });
    },
    async ping() {
      await sql`SELECT 1`;
    },
    settings: {
      async get(key) {
        const rows = await sql<{ value: string }[]>`SELECT value FROM settings WHERE key = ${key}`;
        const row = rows[0];
        return row === undefined ? undefined : JSON.parse(row.value);
      },
      async set(key, value) {
        await sql`
          INSERT INTO settings (key, value) VALUES (${key}, ${JSON.stringify(value)})
          ON CONFLICT (key) DO UPDATE SET value = excluded.value
        `;
      },
    },
    async close() {
      await sql.end();
    },
  };
}
