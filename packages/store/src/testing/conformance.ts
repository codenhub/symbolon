import type { Store } from "@symbolon/core";

/** One behavior every store adapter must have. */
export interface StoreConformanceCase {
  /** What the case checks, usable as a test title. */
  readonly name: string;
  /**
   * Runs the case against a freshly migrated store.
   *
   * @param store - A store no other case has used.
   * @throws {Error} When the store does not behave as the case requires.
   */
  run(store: Store): Promise<void>;
}

function check(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * The cases every adapter runs, each against its own fresh database, as its own test.
 *
 * @remarks
 * They throw rather than use a test framework's assertions, so the suite runs under Vitest, inside workerd,
 * or anywhere else an adapter is tested. `@codenhub/oidc/testing`'s `storeConformanceCases` covers the OIDC
 * half of the store and runs alongside these.
 */
export const storeConformanceCases: readonly StoreConformanceCase[] = [
  {
    name: "migrating again applies nothing and does not fail",
    async run(store) {
      await store.migrate();
    },
  },
  {
    name: "ping resolves",
    async run(store) {
      await store.ping();
    },
  },
  {
    name: "a setting never written reads as undefined",
    async run(store) {
      check((await store.settings.get("absent")) === undefined, "expected undefined for an absent setting");
    },
  },
  {
    name: "a setting reads back as a copy of what was written",
    async run(store) {
      const written = { mode: "invite-only", limits: [1, 2] };
      await store.settings.set("registration", written);
      const read = await store.settings.get("registration");
      check(JSON.stringify(read) === JSON.stringify(written), "expected the written value back");
      check(read !== written, "expected a copy, not the written object");
    },
  },
  {
    name: "writing a setting again replaces it",
    async run(store) {
      await store.settings.set("name", "first");
      await store.settings.set("name", "second");
      check((await store.settings.get("name")) === "second", "expected the second value");
    },
  },
];
