/**
 * Rebuilds a request's URL on the issuer's origin, keeping only its path and query.
 *
 * @remarks
 * The host a request arrived on is the client's choice on every runtime: the `Host` header on Node.js, and on
 * Workers whichever route or `*.workers.dev` name reached the Worker. Routes read the URL this returns, never
 * `request.url`, so no URL Symbolon builds can name another origin.
 *
 * @param request - The incoming request.
 * @param origin - The issuer's origin, such as `https://id.example.com`.
 * @returns A URL on `origin` with the request's path and query.
 */
export function issuerUrl(request: Request, origin: string): URL {
  const received = new URL(request.url);
  const url = new URL(origin);
  // Assigned rather than resolved: `new URL("//evil.example/x", origin)` would read a scheme-relative path as
  // another host, while assigning a path never changes the host.
  url.pathname = received.pathname;
  url.search = received.search;
  return url;
}
