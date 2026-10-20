import { describe, it } from "vitest";

import { storeConformanceCases } from "./conformance";
import { createMemoryStore } from "./memory-store";

describe("createMemoryStore", () => {
  for (const conformanceCase of storeConformanceCases) {
    it(conformanceCase.name, async () => {
      const store = createMemoryStore();
      await store.migrate();
      try {
        await conformanceCase.run(store);
      } finally {
        await store.close();
      }
    });
  }
});
