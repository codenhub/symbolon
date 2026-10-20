/**
 * One schema change, written once per SQL dialect. The two versions must mean the same thing: a migration is
 * reviewed as a pair, and the conformance suite runs against every database to catch a pair that drifts.
 */
export interface Migration {
  /** Sortable and never reused, such as `0001_settings`. Recorded once the migration is applied. */
  readonly id: string;
  /** For SQLite and Cloudflare D1, which speaks SQLite: one statement per entry, as D1's `prepare` takes one. */
  readonly sqlite: readonly string[];
  /** For PostgreSQL: one statement per entry. */
  readonly postgres: readonly string[];
}

/** The table each adapter records applied migration ids in, created before the first migration runs. */
export const MIGRATIONS_TABLE = "symbolon_migrations";

/** Every migration, in the order they apply. Append only: an applied migration is never edited or removed. */
export const MIGRATIONS: readonly Migration[] = [
  {
    id: "0001_settings",
    sqlite: ["CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)"],
    postgres: ["CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)"],
  },
];

/**
 * Lists the migrations still to apply.
 *
 * @param appliedIds - The ids already recorded in {@link MIGRATIONS_TABLE}.
 * @returns The pending migrations in order; empty when the schema is current.
 * @throws {Error} When an applied id is unknown, which means the database is newer than this build.
 */
export function pendingMigrations(appliedIds: Iterable<string>): readonly Migration[] {
  const applied = new Set(appliedIds);
  const known = new Set(MIGRATIONS.map((migration) => migration.id));
  for (const id of applied) {
    if (!known.has(id)) {
      throw new Error(`The database has migration ${id}, which this build does not know. Upgrade Symbolon.`);
    }
  }
  return MIGRATIONS.filter((migration) => !applied.has(migration.id));
}
