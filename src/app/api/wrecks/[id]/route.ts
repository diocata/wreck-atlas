import { NextResponse } from "next/server";
import { findWreck } from "@/lib/repositories/demo-wreck-repository";
import { wreckIdSchema } from "@/lib/validation/wreck-query";

export function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  return params.then(({ id }) => {
    const parsed = wreckIdSchema.safeParse(id);
    if (!parsed.success) return NextResponse.json({ error: "Invalid wreck ID", issues: parsed.error.issues }, { status: 400 });
    const wreck = findWreck(parsed.data);
    return wreck ? NextResponse.json(wreck, { headers: { "Cache-Control": "public, max-age=300" } }) : NextResponse.json({ error: "Wreck not found" }, { status: 404 });
  });
}
