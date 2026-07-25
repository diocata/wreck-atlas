import { NextRequest, NextResponse } from "next/server";
import {
  fetchWreckTile,
  getWreckDataSource,
} from "@/lib/repositories/wreck-repository";
import {
  eraSchema,
  tileCoordinateSchema,
} from "@/lib/validation/wreck-query";

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ x: string; y: string; z: string }>;
  },
) {
  if (getWreckDataSource() !== "supabase") {
    return NextResponse.json(
      { error: "Vector tiles are unavailable in demo mode" },
      { status: 404 },
    );
  }

  const coordinates = tileCoordinateSchema.safeParse(await params);
  const era = eraSchema.safeParse(
    request.nextUrl.searchParams.get("era") ?? "all",
  );

  if (!coordinates.success || !era.success) {
    return NextResponse.json(
      { error: "Invalid vector tile request" },
      { status: 400 },
    );
  }

  try {
    const tile = await fetchWreckTile(
      coordinates.data.z,
      coordinates.data.x,
      coordinates.data.y,
      era.data,
    );

    return new Response(new Uint8Array(tile), {
      headers: {
        "Cache-Control":
          "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
        "Content-Type": "application/vnd.mapbox-vector-tile",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Wreck tile unavailable" },
      { status: 503 },
    );
  }
}
