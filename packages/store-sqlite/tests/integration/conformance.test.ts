import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { storeConformanceCases } from "@symbolon/store/testing";
import { afterAll, describe, expect, it } from "vitest";

import { createSqliteStore } from "../../src/index";

describe("createSqliteStore", () => {
  for (const conformanceCase of storeConformanceCases) {
    it(conformanceCase.name, async () => {
      const store = createSqliteStore({ path: ":memory:" });
      await store.migrate();
      try {
        await conformanceCase.run(store);
      } finally {
        await store.close();
      }
    });
  }

  describe("on a file", () => {
    const directory = mkdtempSync(join(tmpdir(), "symbolon-sqlite-"));
    afterAll(() => rmSync(directory, { recursive: true, force: true }));

    it("shouldKeepSettingsAcrossReopening", async () => {
      const path = join(directory, "symbolon.db");
      const first = createSqliteStore({ path });
      await first.migrate();
      await first.settings.set("name", "Acme");
      await first.close();

      const second = createSqliteStore({ path });
      await second.migrate();

      expect(await second.settings.get("name")).toBe("Acme");
      await second.close();
    });
  });
});
