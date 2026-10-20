import { formatIssue, formatPath, hostname, object, oneOf, optional, string, url } from "@codenhub/validation";

/** The minimum length of `SYMBOLON_SECRET`, which `openssl rand -base64 32` (44 characters) exceeds. */
export const MIN_SECRET_LENGTH = 32;

/** The settings every runtime needs before the database exists. Everything else lives in the database. */
export interface Config {
  /** The public URL of the instance, used byte for byte as the OIDC issuer. */
  readonly issuer: string;
  /** The master secret that encrypts sensitive data at rest. Never logged, never returned. */
  readonly secret: string;
  /** Whether the instance runs in local-development mode, which is the only mode that allows plain HTTP. */
  readonly isDevMode: boolean;
}

/** Thrown by {@link loadConfig} when the environment is missing a value or holds an invalid one. */
export class ConfigError extends Error {
  /** One line per problem, naming the variable but never its value. */
  readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(`Invalid configuration:\n${problems.map((problem) => `  - ${problem}`).join("\n")}`);
    this.name = "ConfigError";
    this.problems = problems;
  }
}

const ENV_NAMES = {
  issuer: "SYMBOLON_ISSUER",
  secret: "SYMBOLON_SECRET",
  isDevMode: "SYMBOLON_DEV_MODE",
} as const;

const devModeFlag = optional(oneOf(["true", "false"]), "false");

// A self-hosted instance often lives on a private network (`https://sso.corp.lan`), so any host name is
// accepted. The scheme is what invariant 1 governs: plain HTTP only in local-development mode.
const productionIssuer = url({
  protocols: ["https"],
  host: hostname(),
  message: "Must be an absolute https:// URL (plain http:// needs SYMBOLON_DEV_MODE=true, for local development only)",
});
const devIssuer = url({ protocols: ["http", "https"], host: hostname() });

/**
 * Reads the {@link Config} from environment variables.
 *
 * @param env - The variables, such as `process.env` on Node.js or the Worker's `env`.
 * @returns The configuration, with the issuer as the URL parser writes it.
 * @throws {ConfigError} When a variable is missing or invalid, including an `http` issuer outside dev mode. The
 *   message names the variables, never their values.
 */
export function loadConfig(env: Readonly<Record<string, unknown>>): Config {
  const mode = devModeFlag(env[ENV_NAMES.isDevMode]);
  const isDevMode = mode.ok && mode.value === "true";
  const schema = object({
    issuer: isDevMode ? devIssuer : productionIssuer,
    secret: string({ min: MIN_SECRET_LENGTH }),
    isDevMode: devModeFlag,
  });
  const result = schema({
    issuer: env[ENV_NAMES.issuer],
    secret: env[ENV_NAMES.secret],
    isDevMode: env[ENV_NAMES.isDevMode],
  });
  if (!result.ok) {
    throw new ConfigError(
      result.error.issues.map((issue) => {
        const field = formatPath(issue.path) as keyof typeof ENV_NAMES;
        return `${ENV_NAMES[field] ?? field}: ${formatIssue(issue)}`;
      }),
    );
  }
  return {
    issuer: result.value.issuer,
    secret: result.value.secret,
    isDevMode: result.value.isDevMode === "true",
  };
}
