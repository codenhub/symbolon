import {
  coerceNumber,
  formatIssue,
  formatPath,
  hostname,
  ip,
  object,
  optional,
  string,
  union,
} from "@codenhub/validation";
import { ConfigError } from "@symbolon/core";

/** The settings only the Node.js server reads, on top of the core {@link Config}. */
export interface NodeConfig {
  /** The TCP port to listen on. */
  readonly port: number;
  /** The interface to listen on: an IP address or a host name. */
  readonly host: string;
  /** A SQLite file path or a `postgres://` URL, or `undefined` for the default SQLite file. */
  readonly database?: string | undefined;
}

const ENV_NAMES = {
  port: "SYMBOLON_PORT",
  host: "SYMBOLON_HOST",
  database: "SYMBOLON_DATABASE",
} as const;

// Loopback unless told otherwise: a dev instance is not reachable from the network by accident. The Docker
// image sets SYMBOLON_HOST=0.0.0.0.
const schema = object({
  port: optional(coerceNumber({ int: true, min: 1, max: 65535 }), 3000),
  host: optional(union([ip(), hostname()]), "127.0.0.1"),
  database: optional(string({ max: 4096 })),
});

/**
 * Reads the {@link NodeConfig} from environment variables.
 *
 * @param env - The variables, usually `process.env`.
 * @returns The configuration, with the defaults filled in.
 * @throws {ConfigError} When a variable is invalid. The message names the variables, never their values: a
 *   PostgreSQL URL holds its password.
 */
export function loadNodeConfig(env: Readonly<Record<string, string | undefined>>): NodeConfig {
  const result = schema({
    port: env[ENV_NAMES.port],
    host: env[ENV_NAMES.host],
    database: env[ENV_NAMES.database],
  });
  if (!result.ok) {
    throw new ConfigError(
      result.error.issues.map((issue) => {
        const field = formatPath(issue.path) as keyof typeof ENV_NAMES;
        return `${ENV_NAMES[field] ?? field}: ${formatIssue(issue)}`;
      }),
    );
  }
  return result.value;
}
