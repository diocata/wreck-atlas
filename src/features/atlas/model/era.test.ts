import { describe, expect, it } from "vitest";
import { isWreckInEra } from "./era";

describe("isWreckInEra", () => {
  it("keeps exact era boundaries and excludes unknown years from bounded eras", () => {
    expect(isWreckInEra({ sunkYear: 1899 }, "before-1900")).toBe(true);
    expect(isWreckInEra({ sunkYear: 1900 }, "before-1900")).toBe(false);
    expect(isWreckInEra({ sunkYear: 1900 }, "1900-1945")).toBe(true);
    expect(isWreckInEra({ sunkYear: 1945 }, "1900-1945")).toBe(true);
    expect(isWreckInEra({ sunkYear: 1946 }, "1900-1945")).toBe(false);
    expect(isWreckInEra({ sunkYear: 1946 }, "after-1945")).toBe(true);
    expect(isWreckInEra({ sunkYear: null }, "after-1945")).toBe(false);
    expect(isWreckInEra({ sunkYear: null }, "all")).toBe(true);
  });
});
