import { del, get, set } from "idb-keyval";
import { z } from "zod";
import {
  wreckCompactItemSchema,
  type WreckCompactItem,
} from "@/domain/wreck";
import {
  measureAtlasAsync,
  measureAtlasTask,
} from "@/features/atlas/model/performance";

const DATA_KEY = "wreck-atlas-compact-data";
const ETAG_KEY = "wreck-atlas-compact-etag";
const compactPayloadSchema = z.object({
  wrecks: z.array(wreckCompactItemSchema),
  meta: z.object({
    etag: z.string().min(1),
  }),
});

export type CachedWreckData = {
  wrecks: WreckCompactItem[];
  etag: string;
};

export type WreckRevalidation =
  | { status: "not-modified" }
  | { status: "updated"; data: CachedWreckData };

function throwIfAborted(signal?: AbortSignal) {
  if (!signal?.aborted) return;

  throw signal.reason instanceof Error
    ? signal.reason
    : new DOMException("The operation was aborted.", "AbortError");
}

export async function loadCachedWrecks(): Promise<CachedWreckData | null> {
  if (typeof window === "undefined") return null;

  try {
    const [cachedData, etag] = await measureAtlasAsync(
      "atlas:compact-cache-read",
      () => Promise.all([
        get<unknown>(DATA_KEY),
        get<unknown>(ETAG_KEY),
      ]),
    );
    const [parsedWrecks, parsedEtag] = measureAtlasTask(
      "atlas:compact-validate",
      () => [
        z.array(wreckCompactItemSchema).safeParse(cachedData),
        z.string().min(1).safeParse(etag),
      ] as const,
    );

    if (parsedWrecks.success && parsedEtag.success) {
      return { wrecks: parsedWrecks.data, etag: parsedEtag.data };
    }
  } catch (error) {
    console.warn("Failed to read from IndexedDB cache:", error);
  }

  return null;
}

export async function revalidateWrecks(
  currentEtag: string | null,
  signal?: AbortSignal,
): Promise<WreckRevalidation> {
  if (typeof window === "undefined") {
    throw new Error("Wreck cache revalidation requires a browser");
  }

  const headers: Record<string, string> = {};
  if (currentEtag) headers["If-None-Match"] = currentEtag;

  const request: RequestInit = { headers };
  if (signal) request.signal = signal;

  const response = await measureAtlasAsync(
    "atlas:compact-fetch",
    () => fetch("/api/wrecks/compact", request),
  );
  if (response.status === 304) return { status: "not-modified" };
  if (!response.ok) throw new Error(`Server returned ${response.status}`);

  const payload = await response.json();
  const parsed = measureAtlasTask(
    "atlas:compact-validate",
    () => compactPayloadSchema.safeParse(payload),
  );
  if (!parsed.success) throw new Error("Received invalid compact wreck data");
  throwIfAborted(signal);

  const data = { wrecks: parsed.data.wrecks, etag: parsed.data.meta.etag };
  await Promise.all([set(DATA_KEY, data.wrecks), set(ETAG_KEY, data.etag)]);
  return { status: "updated", data };
}

export async function clearWreckCache(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    await Promise.all([del(DATA_KEY), del(ETAG_KEY)]);
  } catch (error) {
    console.warn("Failed to clear IndexedDB cache:", error);
  }
}
