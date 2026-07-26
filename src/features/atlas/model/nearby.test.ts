import { describe, expect, it } from "vitest";
import type { WreckCompactItem } from "@/domain/wreck";
import {
  distanceBetweenCoordinatesKm,
  findNearbyWrecks,
} from "./nearby";

const base: Omit<WreckCompactItem, "id" | "name" | "coordinates"> = {
  category: "dangerous wreck",
  type: "Wreck",
  sunkYear: null,
  depthM: null,
};

describe("nearby wreck discovery", () => {
  it("calculates straight-line map distance", () => {
    expect(distanceBetweenCoordinatesKm([0, 0], [0, 1])).toBeCloseTo(
      111.2,
      1,
    );
  });

  it("excludes the selection, limits the radius, and orders nearest first", () => {
    const wrecks: WreckCompactItem[] = [
      { ...base, id: "selected", name: "Selected", coordinates: [0, 0] },
      { ...base, id: "far", name: "Far", coordinates: [0, 1] },
      { ...base, id: "second", name: "Second", coordinates: [0, 0.1] },
      { ...base, id: "first", name: "First", coordinates: [0, 0.05] },
    ];

    const result = findNearbyWrecks(wrecks, "selected", [0, 0], 20, 1);

    expect(result.totalWithinRadius).toBe(2);
    expect(result.items.map((item) => item.id)).toEqual(["first"]);
  });
});
