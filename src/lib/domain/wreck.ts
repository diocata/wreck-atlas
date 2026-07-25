import { z } from "zod";

export const wreckSchema = z.object({
  id: z.string().min(1).max(120),
  sourceId: z.string().min(1).max(120),
  name: z.string().min(1).max(220),
  category: z.string(),
  type: z.string(),
  coordinates: z.tuple([
    z.number().min(-180).max(180),
    z.number().min(-90).max(90),
  ]),
  sunkYear: z.number().int().nullable(),
  depthM: z.number().nullable(),
  story: z.string(),
  surveyNotes: z.string(),
  source: z.string(),
  sourceRelease: z.string(),
  sourceUrl: z.url().nullable(),
  licence: z.string(),
  provenance: z.enum(["ukho-derived", "prototype-reference"]),
  approximatePosition: z.boolean(),
  prototype: z.boolean(),
});

export type Wreck = z.infer<typeof wreckSchema>;
export type WreckFeature = Pick<
  Wreck,
  "id" | "name" | "category" | "coordinates" | "sunkYear" | "depthM"
>;
export type WreckCompactItem = Pick<
  Wreck,
  "id" | "name" | "category" | "type" | "coordinates" | "sunkYear" | "depthM"
>;
export type WreckDataSource = "demo" | "supabase";

