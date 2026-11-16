import { describe, expect, it } from "vitest";

import { BodyTooLargeError, readBody } from "./read-body";

function post(body: BodyInit | null, headers?: HeadersInit): Request {
  // `duplex` is required by Node.js for a stream body; the Fetch types do not have it yet.
  return new Request("https://id.example.com/token", { method: "POST", body, headers, duplex: "half" } as RequestInit);
}

function streamOf(...chunks: string[]): { stream: ReadableStream<Uint8Array>; pulled: () => number } {
  const encoder = new TextEncoder();
  let index = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      const chunk = chunks[index++];
      if (chunk === undefined) {
        controller.close();
      } else {
        controller.enqueue(encoder.encode(chunk));
      }
    },
  });
  return { stream, pulled: () => index };
}

describe("readBody", () => {
  it("shouldAcceptABodyOfExactlyTheLimit", async () => {
    const body = await readBody(post("abcd"), 4);

    expect(new TextDecoder().decode(body)).toBe("abcd");
  });

  it("shouldRejectABodyOneByteOverTheLimit", async () => {
    await expect(readBody(post("abcde"), 4)).rejects.toBeInstanceOf(BodyTooLargeError);
  });

  it("shouldReturnAnEmptyBodyWhenThereIsNone", async () => {
    const body = await readBody(new Request("https://id.example.com/token"), 4);

    expect(body.byteLength).toBe(0);
  });

  it("shouldJoinTheChunksInOrder", async () => {
    const { stream } = streamOf("ab", "cd", "e");

    const body = await readBody(post(stream), 5);

    expect(new TextDecoder().decode(body)).toBe("abcde");
  });

  it("shouldStopReadingOnceTheLimitIsPassed", async () => {
    const { stream, pulled } = streamOf("ab", "cd", "ef", "gh", "ij");

    await expect(readBody(post(stream), 3)).rejects.toBeInstanceOf(BodyTooLargeError);
    expect(pulled()).toBeLessThan(5);
  });

  it("shouldIgnoreAnUnderstatedContentLength", async () => {
    const { stream } = streamOf("abcdef");

    await expect(readBody(post(stream, { "Content-Length": "2" }), 4)).rejects.toBeInstanceOf(BodyTooLargeError);
  });
});
