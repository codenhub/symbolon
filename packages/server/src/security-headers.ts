// Invariant 5 (docs/specs/invariants.md): every response carries these. The CSP is the strictest that still
// renders a page: pages load their own scripts and styles only, and anything inline needs a nonce.
const BASELINE_HEADERS: Readonly<Record<string, string>> = {
  "Content-Security-Policy":
    "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
};

const HSTS = "max-age=63072000; includeSubDomains";

/**
 * Returns a copy of a response with the security headers every Symbolon response carries.
 *
 * @param response - The response a route produced. Headers it already set are kept.
 * @param isHttps - Whether the instance is served over HTTPS, which adds HSTS.
 * @returns A new response; the original is not modified.
 */
export function withSecurityHeaders(response: Response, isHttps: boolean): Response {
  const secured = new Response(response.body, response);
  for (const [name, value] of Object.entries(BASELINE_HEADERS)) {
    if (!secured.headers.has(name)) {
      secured.headers.set(name, value);
    }
  }
  if (isHttps) {
    secured.headers.set("Strict-Transport-Security", HSTS);
  }
  return secured;
}
