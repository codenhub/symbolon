// Ports: what the core needs from the runtime, implemented by the adapters. They live here, with their
// consumer, so that the core depends on no adapter and every adapter depends on the core.

/** Instance settings, kept as JSON values under string keys. */
export interface SettingsStore {
  /**
   * Reads a setting.
   *
   * @param key - The setting's name.
   * @returns The stored value, or `undefined` when the setting was never written.
   */
  get(key: string): Promise<unknown>;
  /**
   * Writes a setting, replacing any earlier value.
   *
   * @param key - The setting's name.
   * @param value - Any value `JSON.stringify` can write.
   */
  set(key: string, value: unknown): Promise<void>;
}

/** Everything Symbolon keeps. Each database has an adapter that implements it. */
export interface Store {
  /** Applies every migration not yet applied, in order. Running it again applies nothing. */
  migrate(): Promise<void>;
  /** Resolves when the database answers a trivial query, and rejects otherwise. Used by the health check. */
  ping(): Promise<void>;
  /** Instance settings. */
  readonly settings: SettingsStore;
  /** Releases the connection. The store is unusable afterwards. */
  close(): Promise<void>;
}
