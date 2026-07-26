import { describe, expect, it } from "vitest";
import type { WreckCompactItem } from "@/domain/wreck";
import { chooseDiscoveryWreck } from "./discovery";

const wrecks: WreckCompactItem[] = [
  {
    id: "unknown",
    name: "UNIDENTIFIED WRECK 42",
    category: "Wreck",
    type: "Wreck",
    coordinates: [0, 0],
    sunkYear: 1942,
    depthM: 12,
  },
  {
    id: "obstruction",
    name: "Foul ground",
    category: "Foul ground",
    type: "Foul ground",
    coordinates: [1, 1],
    sunkYear: 1910,
    depthM: 5,
  },
  {
    id: "sparse",
    name: "Named but sparse",
    category: "Wreck",
    type: "Wreck",
    coordinates: [2, 2],
    sunkYear: null,
    depthM: null,
  },
  {
    id: "rich",
    name: "HMS Reported",
    category: "Dangerous wreck",
    type: "Wreck",
    coordinates: [3, 3],
    sunkYear: 1917,
    depthM: null,
  },
];

describe("chooseDiscoveryWreck", () => {
  it("prefers named wrecks with a reported year or depth", () => {
    expect(chooseDiscoveryWreck(wrecks, null, () => 0)?.id).toBe("rich");
  });

  it("excludes the current selection and falls back to a named sparse wreck", () => {
    expect(chooseDiscoveryWreck(wrecks, "rich", () => 0.8)?.id).toBe("sparse");
  });

  it("returns null instead of promoting unidentified or obstruction records", () => {
    expect(chooseDiscoveryWreck(wrecks.slice(0, 2), null, () => 0)).toBeNull();
  });
});
