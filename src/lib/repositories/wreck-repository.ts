import "server-only";

import {
  featuresFor as demoFeaturesFor,
  findWreck as findDemoWreck,
  searchWrecks as searchDemoWrecks,
} from "@/lib/repositories/demo-wreck-repository";
import { z } from "zod";
import type {
  Wreck,
  WreckDataSource,
  WreckFeature,
} from "@/lib/domain/wreck";

const sourceName = "UK Hydrographic Office Global Wrecks & Obstructions";
const sourceRelease = "July 2026";
const sourceUrl = "https://www.admiralty.co.uk/access-data/marine-data";
const licence = "Open Government Licence v3.0";

const publicWreckRowSchema = z.object({
  id: z.number().int().positive(),
  source_id: z.string(),
  source_record_index: z.number().int().positive(),
  name: z.string().nullable(),
  category: z.string().nullable(),
  obstruction_category: z.string().nullable(),
  status: z.string().nullable(),
  classification: z.string().nullable(),
  vessel_type: z.string().nullable(),
  longitude: z.number(),
  latitude: z.number(),
  depth_m: z.number().nullable(),
  sunk_year: z.number().int().nullable(),
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

export type WreckSearchResult = {
  id: string;
  name: string;
  coordinates: [number, number];
  sunkYear: number | null;
  type: string;
};

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
    provenance: "ukho-derived",
    approximatePosition: false,
    prototype: false,
  };
}

export function getWreckDataSource(): WreckDataSource {
  const configured = process.env.WRECK_DATA_SOURCE?.trim().toLowerCase();

  if (configured === "demo") {
    return "demo";
  }

  if (configured === "supabase") {
    getSupabaseConfig();
    return "supabase";
  }

  return process.env.SUPABASE_URL && process.env.SUPABASE_PUBLISHABLE_KEY
    ? "supabase"
    : "demo";
}

export function featuresFor(era?: string): WreckFeature[] {
  return demoFeaturesFor(era);
}

export async function findWreck(id: string): Promise<Wreck | undefined> {
  if (getWreckDataSource() === "demo") {
    return findDemoWreck(id);
  }

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
  if (getWreckDataSource() === "demo") {
    return searchDemoWrecks(query).map(
      ({ id, name, coordinates, sunkYear, type }) => ({
        id,
        name,
        coordinates,
        sunkYear,
        type,
      }),
    );
  }

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

export async function fetchWreckTile(
  zoom: number,
  x: number,
  y: number,
  era: string,
): Promise<Buffer> {
  if (getWreckDataSource() !== "supabase") {
    throw new Error("Vector wreck tiles require the Supabase data source");
  }

  const encoded = await supabaseRequest<unknown>(
    "/rpc/get_public_wreck_tile",
    {
      method: "POST",
      body: JSON.stringify({
        tile_z: zoom,
        tile_x: x,
        tile_y: y,
        era_filter: era,
      }),
      cache: "no-store",
    },
  );

  return Buffer.from(z.string().parse(encoded), "base64");
}
