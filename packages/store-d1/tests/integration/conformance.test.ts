import { storeConformanceCases } from "@symbolon/store/testing";
import { convertV4MiniflareOptions, Miniflare } from "miniflare";
import { afterEach, describe, it } from "vitest";

import { createD1Store, type D1DatabaseLike } from "../../src/index";

// A real D1 database, in workerd, through Miniflare. Each case gets a Miniflare instance of its own, whose
// in-memory database starts empty.
describe("createD1Store", () => {
  let worker: Miniflare | undefined;

  afterEach(async () => {
    await worker?.dispose();
    worker = undefined;
  });

  for (const conformanceCase of storeConformanceCases) {
    it(conformanceCase.name, async () => {
      worker = new Miniflare(
        convertV4MiniflareOptions({ modules: true, script: "export default {}", d1Databases: ["DB"] }),
      );
      const db = (await worker.getD1Database("DB")) as unknown as D1DatabaseLike;
      const store = createD1Store(db);
      await store.migrate();
      await conformanceCase.run(store);
    });
  }
});
