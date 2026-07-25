import { get, set, del } from "idb-keyval";
import { z } from "zod";
import {
  wreckCompactItemSchema,
  type WreckCompactItem,
} from "@/lib/domain/wreck";

const DATA_KEY = "wreck-atlas-compact-data";
const ETAG_KEY = "wreck-atlas-compact-etag";
const compactPayloadSchema = z.object({
  wrecks: z.array(wreckCompactItemSchema),
  meta: z.object({
    etag: z.string().min(1),
  }),
});

export type CachedWreckResult = {
  wrecks: WreckCompactItem[];
  fromCache: boolean;
  etag: string | null;
};

export async function loadCachedWrecks(
  era: string = "all",
): Promise<CachedWreckResult> {
  if (typeof window === "undefined") {
    return { wrecks: [], fromCache: false, etag: null };
  }

  try {
    const [cachedData, cachedEtag] = await Promise.all([
      get<WreckCompactItem[]>(DATA_KEY),
      get<string>(ETAG_KEY),
    ]);

    const parsedCache = z.array(wreckCompactItemSchema).safeParse(cachedData);

    if (parsedCache.success && parsedCache.data.length > 0 && cachedEtag) {
      return {
        wrecks: filterByEra(parsedCache.data, era),
        fromCache: true,
        etag: cachedEtag,
      };
    }
  } catch (error) {
    console.warn("Failed to read from IndexedDB cache:", error);
  }

  const fresh = await revalidateWrecks(null, "all");
  const wrecks = fresh || [];

  return {
    wrecks: filterByEra(wrecks, era),
    fromCache: false,
    etag: null,
  };
}

export async function revalidateWrecks(
  currentEtag: string | null,
  era: string = "all",
): Promise<WreckCompactItem[] | null> {
  if (typeof window === "undefined") return null;

  try {
    const headers: Record<string, string> = {};
    if (currentEtag) {
      headers["If-None-Match"] = currentEtag;
    }

    const response = await fetch("/api/wrecks/compact", {
      headers,
    });

    if (response.status === 304) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const parsed = compactPayloadSchema.safeParse(await response.json());

    if (parsed.success) {
      await Promise.all([
        set(DATA_KEY, parsed.data.wrecks),
        set(ETAG_KEY, parsed.data.meta.etag),
      ]);
      return filterByEra(parsed.data.wrecks, era);
    }
  } catch (error) {
    console.warn("Background revalidation failed:", error);
  }

  return null;
}

export async function clearWreckCache(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await Promise.all([del(DATA_KEY), del(ETAG_KEY)]);
  } catch (error) {
    console.warn("Failed to clear IndexedDB cache:", error);
  }
}

function filterByEra(
  wrecks: WreckCompactItem[],
  era: string,
): WreckCompactItem[] {
  if (!era || era === "all") return wrecks;
  return wrecks.filter((w) => {
    if (!w.sunkYear) return false;
    if (era === "before-1900") return w.sunkYear < 1900;
    if (era === "1900-1945") return w.sunkYear >= 1900 && w.sunkYear <= 1945;
    return w.sunkYear > 1945;
  });
}
