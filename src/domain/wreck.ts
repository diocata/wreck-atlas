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
  approximatePosition: z.boolean(),
});

export type Wreck = z.infer<typeof wreckSchema>;
export type WreckCompactItem = Pick<
  Wreck,
  "id" | "name" | "category" | "type" | "coordinates" | "sunkYear" | "depthM"
>;

export const wreckCompactItemSchema = wreckSchema.pick({
  id: true,
  name: true,
  category: true,
  type: true,
  coordinates: true,
  sunkYear: true,
  depthM: true,
});

export const wreckSearchResultSchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().min(1).max(220),
  coordinates: z.tuple([
    z.number().min(-180).max(180),
    z.number().min(-90).max(90),
  ]),
  sunkYear: z.number().int().nullable(),
  type: z.string(),
});

export type WreckSearchResult = z.infer<typeof wreckSearchResultSchema>;
