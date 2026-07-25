import { z } from "zod";

export const eraSchema = z.enum(["all", "before-1900", "1900-1945", "after-1945"]);
export const searchSchema = z.string().trim().min(2).max(80);
export const wreckIdSchema = z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/i);
export const tileCoordinateSchema = z
  .object({
    x: z.coerce.number().int().nonnegative(),
    y: z.coerce.number().int().nonnegative(),
    z: z.coerce.number().int().min(0).max(14),
  })
  .refine(
    ({ x, y, z }) => x < 2 ** z && y < 2 ** z,
    "Tile coordinates exceed the zoom range",
  );
