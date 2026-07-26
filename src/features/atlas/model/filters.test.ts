import { describe, expect, it } from "vitest";
import type { WreckCompactItem } from "@/domain/wreck";
import {
  countActiveFilters,
  getRecordKind,
  isWreckInDepthBand,
  isWreckInFilters,
} from "./filters";

const wreck: WreckCompactItem = {
  id: "1",
  name: "Test wreck",
  category: "non-dangerous wreck",
  type: "Cargo vessel",
  coordinates: [1, 2],
  sunkYear: 1940,
  depthM: 25,
};

describe("atlas filters", () => {
  it("derives the current release's top-level record kinds", () => {
    expect(getRecordKind("dangerous wreck")).toBe("wreck");
    expect(getRecordKind("foul ground")).toBe("obstruction");
    expect(getRecordKind("Unclassified record")).toBe("unclassified");
    expect(getRecordKind("")).toBe("unclassified");
  });

  it("keeps missing depth as an explicit, selectable state", () => {
    expect(isWreckInDepthBand({ depthM: null }, "all")).toBe(true);
    expect(isWreckInDepthBand({ depthM: null }, "unknown")).toBe(true);
    expect(isWreckInDepthBand({ depthM: null }, "under-10")).toBe(false);
    expect(isWreckInDepthBand({ depthM: 10 }, "under-10")).toBe(false);
    expect(isWreckInDepthBand({ depthM: 10 }, "10-30")).toBe(true);
    expect(isWreckInDepthBand({ depthM: 30 }, "30-100")).toBe(true);
    expect(isWreckInDepthBand({ depthM: 100 }, "100-plus")).toBe(true);
  });

  it("combines committed filters without treating incomplete rows as invalid", () => {
    expect(isWreckInFilters(wreck, {
      era: "1900-1945",
      recordKind: "wreck",
      depthBand: "10-30",
    })).toBe(true);

    expect(isWreckInFilters({ ...wreck, depthM: null }, {
      era: "1900-1945",
      recordKind: "wreck",
      depthBand: "unknown",
    })).toBe(true);
  });

  it("counts only non-default filters", () => {
    expect(countActiveFilters({
      era: "all",
      recordKind: "all",
      depthBand: "all",
    })).toBe(0);
    expect(countActiveFilters({
      era: "after-1945",
      recordKind: "wreck",
      depthBand: "all",
    })).toBe(2);
  });
});
