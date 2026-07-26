import { describe, expect, it } from "vitest";
import type { WreckCompactItem } from "@/domain/wreck";
import { searchCompactWrecks } from "./search";

const wrecks: WreckCompactItem[] = [
  { id: "1", name: "HMS Victory", category: "Wreck", type: "Warship", coordinates: [1, 2], sunkYear: 1744, depthM: 20 },
  { id: "2", name: "victory bell", category: "Wreck", type: "Artefact", coordinates: [3, 4], sunkYear: null, depthM: null },
  { id: "3", name: "Atlantic Star", category: "Wreck", type: "Cargo", coordinates: [5, 6], sunkYear: 1912, depthM: 30 },
];

describe("searchCompactWrecks", () => {
  it("trims and case-folds a query before searching", () => {
    expect(searchCompactWrecks(wrecks, "  ViCtOrY ").map(({ id }) => id)).toEqual(["1", "2"]);
  });

  it("requires two characters and respects its result limit", () => {
    expect(searchCompactWrecks(wrecks, "v")).toEqual([]);
    expect(searchCompactWrecks(wrecks, "victory", 1)).toHaveLength(1);
  });
});
