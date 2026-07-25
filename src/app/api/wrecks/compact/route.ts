import { NextRequest, NextResponse } from "next/server";
import {
  getCompactWrecks,
  getWreckDataSource,
} from "@/lib/repositories/wreck-repository";
import { eraSchema } from "@/lib/validation/wreck-query";

const CURRENT_ETAG = '"ukho-2026-q3"';

export async function GET(request: NextRequest) {
  const parsed = eraSchema.safeParse(
    request.nextUrl.searchParams.get("era") ?? "all",
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid era filter", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const era = parsed.data;
  const ifNoneMatch = request.headers.get("if-none-match");

  if (ifNoneMatch && ifNoneMatch === CURRENT_ETAG) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: CURRENT_ETAG,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  }

  try {
    const wrecks = await getCompactWrecks(era);

    return NextResponse.json(
      {
        wrecks,
        meta: {
          etag: CURRENT_ETAG,
          count: wrecks.length,
          source: getWreckDataSource(),
        },
      },
      {
        headers: {
          ETag: CURRENT_ETAG,
          "Cache-Control":
            "public, max-age=86400, stale-while-revalidate=604800",
        },
      },
    );
  } catch (error) {
    console.error("Failed to load compact wrecks:", error);
    return NextResponse.json(
      { error: "Failed to load compact wreck data" },
      { status: 500 },
    );
  }
}
