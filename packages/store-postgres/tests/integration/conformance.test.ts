import { randomUUID } from "node:crypto";

import { storeConformanceCases } from "@symbolon/store/testing";
import postgres from "postgres";
import { describe, it } from "vitest";

import { createPostgresStore } from "../../src/index";

// Runs only against a real server. CI provides one; locally, start one and set the variable, as
// docs/specs/tests.md describes. Skipped rather than failed, so `pnpm test` works without Docker.
const url = process.env["SYMBOLON_TEST_POSTGRES_URL"];

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
