import { z } from "zod";
export const eraSchema = z.enum(["all", "before-1900", "1900-1945", "after-1945"]);
export const searchSchema = z.string().trim().min(2).max(80);
export const wreckIdSchema = z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/i);
