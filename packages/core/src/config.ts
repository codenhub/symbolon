import {
  check,
  formatIssue,
  formatPath,
  hostname,
  object,
  oneOf,
  optional,
  string,
  transform,
  url,
} from "@codenhub/validation";

/** The minimum length of `SYMBOLON_SECRET`, which `openssl rand -base64 32` (44 characters) exceeds. */
export const MIN_SECRET_LENGTH = 32;

/** The settings every runtime needs before the database exists. Everything else lives in the database. */
export interface Config {
  /**
   * The public URL of the instance, used byte for byte as the OIDC issuer. Always in one form: as the URL
   * parser writes it, without a trailing slash, query, fragment or credentials, such as `https://id.example.com`.
   */
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
//
// An app compares the issuer byte for byte, so it has one spelling: `https://id.example.com/` and
// `https://id.example.com` are the same instance, and the trailing slash is dropped, as discovery URLs are
// built by appending `/.well-known/...`. A query or fragment has no place in an issuer (OpenID Connect
// Discovery 1.0, section 3), and the URL parser keeps an empty `?` or `#`, so the serialized URL is checked
// for either character, which in a path it percent-encodes. Credentials are refused by `url` itself.
const noQueryOrFragment = check<string>(
  (href) => !href.includes("?") && !href.includes("#"),
  "Must have no query or fragment",
);
const withoutTrailingSlash = (href: string): string => href.replace(/\/+$/, "");

const productionIssuer = transform(
  url(
    {
      protocols: ["https"],
      host: hostname(),
      message:
        "Must be an absolute https:// URL (plain http:// needs SYMBOLON_DEV_MODE=true, for local development only)",
    },
    noQueryOrFragment,
  ),
  withoutTrailingSlash,
);
const devIssuer = transform(
  url({ protocols: ["http", "https"], host: hostname() }, noQueryOrFragment),
  withoutTrailingSlash,
);

/**
 * Reads the {@link Config} from environment variables.
 *
 * @param env - The variables, such as `process.env` on Node.js or the Worker's `env`.
 * @returns The configuration, with the issuer in its one form ({@link Config.issuer}).
 * @throws {ConfigError} When a variable is missing or invalid, including an `http` issuer outside dev mode and an issuer with a query or fragment. The
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
