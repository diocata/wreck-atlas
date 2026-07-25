import { NextRequest, NextResponse } from "next/server";
import { searchWrecks } from "@/lib/repositories/demo-wreck-repository";
import { searchSchema } from "@/lib/validation/wreck-query";

export function GET(request: NextRequest) {
  const parsed = searchSchema.safeParse(request.nextUrl.searchParams.get("q") ?? "");
  if (!parsed.success) return NextResponse.json({ error: "Search query must contain 2–80 characters", issues: parsed.error.issues }, { status: 400 });
  const q = parsed.data;
  return NextResponse.json(searchWrecks(q).map(({ id, name, coordinates, sunkYear, type }) => ({ id, name, coordinates, sunkYear, type })));
}
