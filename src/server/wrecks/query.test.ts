import { describe, expect, it } from "vitest";
import { searchSchema, wreckIdSchema } from "./query";

describe("wreck request validation", () => {
  it("trims bounded search terms", () => {
    expect(searchSchema.parse("  Lusitania  ")).toBe("Lusitania");
    expect(searchSchema.safeParse("x").success).toBe(false);
    expect(searchSchema.safeParse("x".repeat(81)).success).toBe(false);
  });

  it("allows only URL-safe wreck identifiers", () => {
    expect(wreckIdSchema.parse("wreck-102303")).toBe("wreck-102303");
    expect(wreckIdSchema.safeParse("wreck/102303").success).toBe(false);
  });
});
