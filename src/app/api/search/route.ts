import { NextRequest, NextResponse } from "next/server";
import { searchSchema } from "@/server/wrecks/query";
import { searchWrecks } from "@/server/wrecks/repository";

export async function GET(request: NextRequest) {
  const parsed = searchSchema.safeParse(request.nextUrl.searchParams.get("q") ?? "");
  if (!parsed.success) return NextResponse.json({ error: "Search query must contain 2–80 characters", issues: parsed.error.issues }, { status: 400 });

  try {
    return NextResponse.json(await searchWrecks(parsed.data), {
      headers: { "Cache-Control": "public, max-age=60" },
    });
  } catch {
    return NextResponse.json(
      { error: "Wreck search is unavailable" },
      { status: 503 },
    );
  }
}
