import { NextResponse } from "next/server";
import { wreckIdSchema } from "@/server/wrecks/query";
import { findWreck } from "@/server/wrecks/repository";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsed = wreckIdSchema.safeParse((await params).id);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid wreck ID", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const wreck = await findWreck(parsed.data);

    return wreck
      ? NextResponse.json(wreck, {
          headers: { "Cache-Control": "public, max-age=300" },
        })
      : NextResponse.json({ error: "Wreck not found" }, { status: 404 });
  } catch {
    return NextResponse.json(
      { error: "Wreck details are unavailable" },
      { status: 503 },
    );
  }
}
