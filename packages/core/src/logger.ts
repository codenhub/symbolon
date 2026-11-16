/** Where Symbolon reports what an operator needs to see and no client may: the detail of an unexpected error. */
export interface Logger {
  /**
   * Reports a failure.
   *
   * @param event - What failed, as a stable `snake_case` name such as `request_failed`.
   * @param fields - Context. Fields whose names suggest a secret are redacted, and an `Error` is reduced to
   *   its name and message. Never pass a request's query, a form value, or anything a user typed.
   */
  error(event: string, fields?: Readonly<Record<string, unknown>>): void;
}

const REDACTED = "[redacted]";
// Matched against field names anywhere in the fields, in any letter case: `clientSecret`, `refresh_token`,
// `Authorization`, `set-cookie`.
const SECRET_NAME = /secret|passw|token|code|authorization|cookie|credential|session/i;
// Credentials written into a URL, as a database URL carries them: `postgres://user:password@host`.
const URL_CREDENTIALS = /(\/\/)[^/\s:@]*:[^/\s@]*@/g;
const MAX_DEPTH = 4;

function redact(value: unknown, depth: number): unknown {
  if (typeof value === "string") {
    return value.replace(URL_CREDENTIALS, `$1${REDACTED}@`);
  }
  if (value instanceof Error) {
    // Not its other properties, which for a driver error can hold the connection options.
    return { name: value.name, message: redact(value.message, depth) };
  }
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (depth >= MAX_DEPTH) {
    return REDACTED;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1));
  }
  return Object.fromEntries(
    Object.entries(value).map(([name, item]) => [name, SECRET_NAME.test(name) ? REDACTED : redact(item, depth + 1)]),
  );
}

/**
 * Creates a {@link Logger} that writes one JSON object per line.
 *
 * @remarks
 * Redaction is a backstop for invariant 2, not a licence: it catches a secret under a telling name or inside
 * a URL, not one under an innocent name. Each line has no timestamp; the runtime's log collector adds one.
 *
 * @example
 * ```ts
 * const logger = createLogger((line) => console.error(line));
 * logger.error("request_failed", { method: "GET", path: "/token", error });
 * // {"level":"error","event":"request_failed","method":"GET","path":"/token","error":{"name":"Error","message":"..."}}
 * ```
 *
 * @param write - Receives each line, without a trailing newline.
 * @returns The logger.
 */
export function createLogger(write: (line: string) => void): Logger {
  return {
    error(event, fields = {}) {
      write(JSON.stringify({ level: "error", event, ...(redact(fields, 0) as Record<string, unknown>) }));
    },
  };
}
