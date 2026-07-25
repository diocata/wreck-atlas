import { z } from "zod";

export const searchSchema = z.string().trim().min(2).max(80);
export const wreckIdSchema = z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/i);
