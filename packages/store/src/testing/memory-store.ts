import type { Store } from "@symbolon/core";

/**
 * Creates a store that keeps everything in memory, for tests of code that needs a {@link Store}.
 *
 * @returns A store that passes the conformance suite and loses everything when dropped.
 */
export function createMemoryStore(): Store {
  const settings = new Map<string, string>();
  let isClosed = false;

  const assertOpen = (): void => {
    if (isClosed) {
      throw new Error("The store is closed.");
    }
  };

  return {
    async migrate() {
      assertOpen();
    },
    async ping() {
      assertOpen();
    },
    settings: {
      async get(key) {
        assertOpen();
        const value = settings.get(key);
        return value === undefined ? undefined : JSON.parse(value);
      },
      async set(key, value) {
        assertOpen();
        // Stored as JSON text, as the SQL adapters do, so a test sees the same copy semantics.
        settings.set(key, JSON.stringify(value));
      },
    },
    async close() {
      isClosed = true;
    },
  };
}
