import { randomUUID } from "node:crypto";

import { storeConformanceCases } from "@symbolon/store/testing";
import postgres from "postgres";
import { describe, it } from "vitest";

import { createPostgresStore } from "../../src/index";

// Runs only against a real server. CI provides one; locally, start one and set the variable, as
// docs/tooling.md, "PostgreSQL tests", describes. Skipped rather than failed, so `pnpm test` works without
// Docker, except in CI, where a missing variable would otherwise pass the job with the adapter untested.
const url = process.env["SYMBOLON_TEST_POSTGRES_URL"];
if (url === undefined && process.env["CI"] !== undefined) {
  throw new Error("SYMBOLON_TEST_POSTGRES_URL is not set; CI must run the PostgreSQL tests.");
}

describe.skipIf(url === undefined)("createPostgresStore", () => {
  for (const conformanceCase of storeConformanceCases) {
    it(conformanceCase.name, async () => {
      // Each case gets a schema of its own, so cases never see each other's rows.
      const schema = `test_${randomUUID().replaceAll("-", "")}`;
      const admin = postgres(url ?? "", { onnotice: () => {} });
      await admin.unsafe(`CREATE SCHEMA ${schema}`);
      const store = createPostgresStore({ url: url ?? "", schema });
      try {
        await store.migrate();
        await conformanceCase.run(store);
      } finally {
        await store.close();
        await admin.unsafe(`DROP SCHEMA ${schema} CASCADE`);
        await admin.end();
      }
    });
  }
});
