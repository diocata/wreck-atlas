import "server-only";

import { z } from "zod";
import type {
  Wreck,
  WreckCompactItem,
  WreckSearchResult,
} from "@/domain/wreck";


const sourceName = "UK Hydrographic Office Global Wrecks & Obstructions";
const sourceRelease = "July 2026";
const sourceUrl = "https://www.admiralty.co.uk/access-data/marine-data";
const licence = "Open Government Licence v3.0";

const publicWreckRowSchema = z.object({
  id: z.coerce.number().int().positive(),
  source_id: z.string(),
  source_record_index: z.coerce.number().int().positive(),
  name: z.string().nullable(),
  category: z.string().nullable(),
  obstruction_category: z.string().nullable(),
  status: z.string().nullable(),
  classification: z.string().nullable(),
  vessel_type: z.string().nullable(),
  longitude: z.coerce.number(),
  latitude: z.coerce.number(),
  depth_m: z.coerce.number().nullable(),
  sunk_year: z.coerce.number().int().nullable(),
  position_method: z.string().nullable(),
  circumstances_of_loss: z.string().nullable(),
  surveying_details: z.string().nullable(),
  general_comments: z.string().nullable(),
  source_updated_on: z.string().nullable(),
});

const publicSearchRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  longitude: z.number(),
  latitude: z.number(),
  sunk_year: z.number().int().nullable(),
  vessel_type: z.string(),
});

const mapPointRowSchema = z.object({
  wreck_id: z.coerce.number(),
  name: z.string(),
  category: z.string(),
  sunk_year: z.coerce.number().int().nullable(),
  depth_m: z.coerce.number().nullable(),
  location: z.object({
    coordinates: z.tuple([z.coerce.number(), z.coerce.number()]),
  }),
});


type SupabaseConfig = {
  key: string;
  url: string;
};

function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase data is enabled but SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY is missing",
    );
  }

  return { key, url };
}

async function supabaseRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const { key, url } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1${path}`, {
    ...init,
    headers: {
      apikey: key,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Supabase request failed (${response.status}): ${body.slice(0, 500)}`,
    );
  }

  return response.json() as Promise<T>;
}

function firstText(...values: Array<string | null>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();

    if (trimmed) {
      return trimmed;
    }
  }

  return null;
}

function toWreck(row: z.infer<typeof publicWreckRowSchema>): Wreck {
  const displayName =
    firstText(row.name) ?? `UNIDENTIFIED WRECK ${row.source_id}`;
  const category =
    firstText(
      row.category,
      row.obstruction_category,
      row.classification,
    ) ?? "Unclassified record";
  const type =
    firstText(row.vessel_type, row.classification, category)
      ?? "Wreck or obstruction";
  const story =
    firstText(row.circumstances_of_loss, row.general_comments)
      ?? "This UKHO record documents a wreck or obstruction at the mapped position. No narrative of loss is included in this release.";
  const surveyNotes = [
    firstText(row.surveying_details),
    row.general_comments?.trim() !== story
      ? firstText(row.general_comments)
      : null,
    row.position_method
      ? `Position method: ${row.position_method.trim()}.`
      : null,
    row.source_updated_on
      ? `Source record last amended: ${row.source_updated_on}.`
      : null,
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n\n");

  return {
    id: row.id.toString(),
    sourceId:
      row.source_record_index > 1
        ? `${row.source_id} · occurrence ${row.source_record_index}`
        : row.source_id,
    name: displayName,
    category,
    type,
    coordinates: [row.longitude, row.latitude],
    sunkYear: row.sunk_year,
    depthM: row.depth_m,
    story,
    surveyNotes:
      surveyNotes
      || "No survey notes are included in the normalized public fields for this record.",
    source: sourceName,
    sourceRelease,
    sourceUrl,
    licence,
    approximatePosition: false,
  };
}

let serverCompactCachePromise: Promise<WreckCompactItem[]> | null = null;

async function fetchAllSupabaseCompactWrecks(): Promise<WreckCompactItem[]> {
  const select = "wreck_id,name,category,sunk_year,depth_m,location";
  const allRows: unknown[] = [];
  let page = 0;
  const batchSize = 10;
  let done = false;

  while (!done) {
    const promises: Promise<unknown[]>[] = [];
    for (let i = 0; i < batchSize; i++) {
      const idx = page * batchSize + i;
      const from = idx * 1000;
      const to = from + 999;
      promises.push(
        (async () => {
          let lastError: unknown;

          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              return await supabaseRequest<unknown[]>(
                `/wreck_map_points?select=${select}&published=is.true&active=is.true`,
                {
                  headers: { Range: `${from}-${to}` },
                  cache: "no-store",
                },
              );
            } catch (err) {
              if (String(err).includes("416")) return [];
              lastError = err;

              if (attempt < 3) {
                await new Promise((res) => setTimeout(res, 250 * attempt));
              }
            }
          }

          throw lastError instanceof Error
            ? lastError
            : new Error("Failed to load a compact wreck data page");
        })(),
      );
    }

    const results = await Promise.all(promises);
    for (const res of results) {
      if (!Array.isArray(res) || res.length === 0) {
        done = true;
      } else {
        allRows.push(...res);
        if (res.length < 1000) done = true;
      }
    }
    page++;
  }

  const parsed = z.array(mapPointRowSchema).parse(allRows);
  return parsed.map((row) => ({
    id: String(row.wreck_id),
    name: row.name || `UNIDENTIFIED WRECK ${row.wreck_id}`,
    category: row.category || "Unclassified record",
    type: row.category || "Wreck or obstruction",
    coordinates: [row.location.coordinates[0], row.location.coordinates[1]],
    sunkYear: row.sunk_year,
    depthM: row.depth_m,
  }));
}

export async function getCompactWrecks(): Promise<WreckCompactItem[]> {
  if (!serverCompactCachePromise) {
    serverCompactCachePromise = fetchAllSupabaseCompactWrecks().catch((err) => {
      serverCompactCachePromise = null;
      throw err;
    });
  }

  return serverCompactCachePromise;
}

export async function findWreck(id: string): Promise<Wreck | undefined> {
  const select = [
    "id",
    "source_id",
    "source_record_index",
    "name",
    "category",
    "obstruction_category",
    "status",
    "classification",
    "vessel_type",
    "longitude",
    "latitude",
    "depth_m",
    "sunk_year",
    "position_method",
    "circumstances_of_loss",
    "surveying_details",
    "general_comments",
    "source_updated_on",
  ].join(",");
  const rows = await supabaseRequest<unknown>(
    `/wrecks?select=${select}&id=eq.${encodeURIComponent(id)}&limit=1`,
    { cache: "no-store" },
  );
  const parsed = z.array(publicWreckRowSchema).parse(rows);

  return parsed[0] ? toWreck(parsed[0]) : undefined;
}

export async function searchWrecks(
  query: string,
): Promise<WreckSearchResult[]> {
  const rows = await supabaseRequest<unknown>(
    "/rpc/search_public_wrecks",
    {
      method: "POST",
      body: JSON.stringify({
        search_term: query,
        result_limit: 6,
      }),
      cache: "no-store",
    },
  );

  return z.array(publicSearchRowSchema).parse(rows).map((row) => ({
    id: row.id,
    name: row.name,
    coordinates: [row.longitude, row.latitude],
    sunkYear: row.sunk_year,
    type: row.vessel_type,
  }));
}
