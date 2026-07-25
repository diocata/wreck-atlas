import { NextRequest, NextResponse } from "next/server";
import {
  featuresFor,
  getWreckDataSource,
} from "@/lib/repositories/wreck-repository";
import { eraSchema } from "@/lib/validation/wreck-query";

export function GET(request: NextRequest) {
  const parsed = eraSchema.safeParse(request.nextUrl.searchParams.get("era") ?? "all");
  if (!parsed.success) return NextResponse.json({ error: "Invalid era filter", issues: parsed.error.issues }, { status: 400 });
  const era = parsed.data;

  if (getWreckDataSource() === "supabase") {
    return NextResponse.json(
      {
        type: "VectorTileCollection",
        tiles: [`/api/wrecks/tiles/{z}/{x}/{y}?era=${era}`],
        minzoom: 0,
        maxzoom: 14,
        meta: {
          prototype: false,
          count: 102625,
          source: "UKHO July 2026",
        },
      },
      { headers: { "Cache-Control": "public, max-age=300" } },
    );
  }

  const features = featuresFor(era).map((wreck) => ({ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: wreck.coordinates }, properties: { ...wreck, coordinates: undefined } }));
  return NextResponse.json({ type: "FeatureCollection", features, meta: { prototype: true, count: features.length } }, { headers: { "Cache-Control": "public, max-age=60" } });
}
