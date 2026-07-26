import { describe, expect, it } from "vitest";
import type { WreckCompactItem } from "@/domain/wreck";
import { toWreckFeatureCollection } from "./geojson";

const wrecks: WreckCompactItem[] = [
  { id: "old", name: "Old", category: "Wreck", type: "Ship", coordinates: [-3, 50], sunkYear: 1899, depthM: 12 },
  { id: "war", name: "War", category: "Wreck", type: "Ship", coordinates: [1, 51], sunkYear: 1945, depthM: null },
  { id: "new", name: "New", category: "Wreck", type: "Ship", coordinates: [2, 52], sunkYear: 1946, depthM: 5 },
];

describe("toWreckFeatureCollection", () => {
  it("filters and converts records in one GeoJSON collection", () => {
    const collection = toWreckFeatureCollection(wrecks, {
      era: "1900-1945",
      recordKind: "all",
      depthBand: "all",
    });

    expect(collection).toMatchObject({ type: "FeatureCollection" });
    expect(collection.features).toHaveLength(1);
    expect(collection.features[0]).toEqual({
      type: "Feature",
      geometry: { type: "Point", coordinates: [1, 51] },
      properties: { id: "war", name: "War", category: "Wreck", sunkYear: 1945, depthM: null },
    });
  });
});
