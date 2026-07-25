import { NextRequest, NextResponse } from "next/server";
import { featuresFor } from "@/lib/repositories/demo-wreck-repository";
import { eraSchema } from "@/lib/validation/wreck-query";

export function GET(request: NextRequest) {
  const parsed = eraSchema.safeParse(request.nextUrl.searchParams.get("era") ?? "all");
  if (!parsed.success) return NextResponse.json({ error: "Invalid era filter", issues: parsed.error.issues }, { status: 400 });
  const era = parsed.data;
  const features = featuresFor(era).map((wreck) => ({ type: "Feature" as const, geometry: { type: "Point" as const, coordinates: wreck.coordinates }, properties: { ...wreck, coordinates: undefined } }));
  return NextResponse.json({ type: "FeatureCollection", features, meta: { prototype: true, count: features.length } }, { headers: { "Cache-Control": "public, max-age=60" } });
}
