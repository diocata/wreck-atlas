import type { WreckCompactItem } from "@/domain/wreck";
import { isWreckInEra, type Era } from "@/features/atlas/model/era";

export type WreckFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  {
    id: string;
    name: string;
    category: string;
    sunkYear: number | null;
    depthM: number | null;
  }
>;

export const emptyWreckFeatureCollection: WreckFeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

export function toWreckFeatureCollection(
  wrecks: WreckCompactItem[],
  era: Era,
): WreckFeatureCollection {
  const features: WreckFeatureCollection["features"] = [];

  for (const wreck of wrecks) {
    if (!isWreckInEra(wreck, era)) continue;

    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: wreck.coordinates },
      properties: {
        id: wreck.id,
        name: wreck.name,
        category: wreck.category,
        sunkYear: wreck.sunkYear,
        depthM: wreck.depthM,
      },
    });
  }

  return { type: "FeatureCollection", features };
}
