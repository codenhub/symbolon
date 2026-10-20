import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import type { Store } from "@symbolon/core";
import { createPostgresStore } from "@symbolon/store-postgres";
import { createSqliteStore } from "@symbolon/store-sqlite";

/** Where the SQLite database goes when `SYMBOLON_DATABASE` is not set. The Docker image sets its own. */
export const DEFAULT_DATABASE = "./data/symbolon.db";

/**
 * Opens the store `SYMBOLON_DATABASE` names: a `postgres://` or `postgresql://` URL for PostgreSQL, and
 * anything else as the path of a SQLite file, whose directory is created when missing.
 *
 * @param database - The value of `SYMBOLON_DATABASE`, or `undefined` for {@link DEFAULT_DATABASE}.
 * @returns The store, not yet migrated.
 */
export function openStore(database: string | undefined): Store {
  const location = database === undefined || database === "" ? DEFAULT_DATABASE : database;
  if (/^postgres(ql)?:\/\//.test(location)) {
    return createPostgresStore({ url: location });
  }
  if (location !== ":memory:") {
    mkdirSync(dirname(location), { recursive: true });
  }
  return createSqliteStore({ path: location });
}
