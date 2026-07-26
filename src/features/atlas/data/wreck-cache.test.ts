import { beforeEach, describe, expect, it, vi } from "vitest";

const indexedDb = vi.hoisted(() => new Map<string, unknown>());

vi.mock("idb-keyval", () => ({
  get: vi.fn((key: string) => indexedDb.get(key)),
  set: vi.fn((key: string, value: unknown) => indexedDb.set(key, value)),
  del: vi.fn((key: string) => indexedDb.delete(key)),
}));

import { loadCachedWrecks, revalidateWrecks } from "./wreck-cache";

const wrecks = [
  { id: "1", name: "Signal", category: "Wreck", type: "Ship", coordinates: [1, 2], sunkYear: 1945, depthM: 10 },
];

describe("wreck cache", () => {
  beforeEach(() => {
    indexedDb.clear();
    vi.unstubAllGlobals();
  });

  it("returns valid cached records before any network revalidation", async () => {
    indexedDb.set("wreck-atlas-compact-data", wrecks);
    indexedDb.set("wreck-atlas-compact-etag", "cached-etag");

    await expect(loadCachedWrecks()).resolves.toEqual({ wrecks, etag: "cached-etag" });
  });

  it("uses the ETag while replacing cached records in the background flow", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      wrecks,
      meta: { etag: "fresh-etag" },
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetch);

    await expect(revalidateWrecks("cached-etag")).resolves.toEqual({
      status: "updated",
      data: { wrecks, etag: "fresh-etag" },
    });
    expect(fetch).toHaveBeenCalledWith("/api/wrecks/compact", {
      headers: { "If-None-Match": "cached-etag" },
    });
  });

  it("keeps an ETag-matched cache when the server returns 304", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, {
      status: 304,
    })));

    await expect(revalidateWrecks("cached-etag")).resolves.toEqual({
      status: "not-modified",
    });
  });

  it("rejects malformed and unsuccessful responses instead of caching them", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      wrecks: [{ id: "missing-fields" }],
      meta: { etag: "invalid" },
    }), { status: 200 })));

    await expect(revalidateWrecks(null)).rejects.toThrow(
      "Received invalid compact wreck data",
    );

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, {
      status: 503,
    })));
    await expect(revalidateWrecks(null)).rejects.toThrow("Server returned 503");
  });

  it("forwards abort signals and skips IndexedDB writes after an abort", async () => {
    const controller = new AbortController();
    const fetch = vi.fn().mockImplementation(async () => {
      controller.abort();
      return new Response(JSON.stringify({
        wrecks,
        meta: { etag: "aborted-etag" },
      }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetch);

    await expect(revalidateWrecks(null, controller.signal)).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(fetch).toHaveBeenCalledWith("/api/wrecks/compact", {
      headers: {},
      signal: controller.signal,
    });
    expect(indexedDb.has("wreck-atlas-compact-data")).toBe(false);
    expect(indexedDb.has("wreck-atlas-compact-etag")).toBe(false);
  });
});
