/** Raised when a request body is longer than the limit it was read with. */
export class BodyTooLargeError extends Error {
  constructor(readonly limit: number) {
    super(`The request body is over ${limit} bytes.`);
    this.name = "BodyTooLargeError";
  }
}

/**
 * Reads a request body, refusing one over a byte limit (invariant 4).
 *
 * @remarks
 * The limit is enforced by the read, not by `Content-Length`, which a client can understate or omit. Each
 * chunk is counted before it is kept, so at most one chunk past the limit is ever in memory, and the stream
 * is cancelled as soon as the limit is passed. A body of exactly `limit` bytes is accepted.
 *
 * @param request - The request whose body to read. Its body is consumed.
 * @param limit - The largest accepted body, in bytes.
 * @returns The body's bytes; empty when the request has none.
 * @throws {@link BodyTooLargeError} when the body is over `limit` bytes.
 */
export async function readBody(request: Request, limit: number): Promise<Uint8Array> {
  if (request.body === null) {
    return new Uint8Array();
  }
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    // oxlint-disable-next-line no-await-in-loop -- a stream is read in order, one chunk at a time.
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    size += value.byteLength;
    if (size > limit) {
      // oxlint-disable-next-line no-await-in-loop -- runs once, on the way out of the loop.
      await reader.cancel();
      throw new BodyTooLargeError(limit);
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}
