import type { WreckCompactItem } from "@/domain/wreck";

const earthRadiusKm = 6371.0088;

export type NearbyWreck = WreckCompactItem & {
  distanceKm: number;
};

export type NearbyWrecksResult = {
  items: NearbyWreck[];
  totalWithinRadius: number;
  radiusKm: number;
};

function radians(degrees: number): number {
  return degrees * Math.PI / 180;
}

export function distanceBetweenCoordinatesKm(
  first: [number, number],
  second: [number, number],
): number {
  const [firstLongitude, firstLatitude] = first.map(radians);
  const [secondLongitude, secondLatitude] = second.map(radians);
  const latitudeDelta = secondLatitude - firstLatitude;
  const longitudeDelta = secondLongitude - firstLongitude;
  const a =
    Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(firstLatitude)
      * Math.cos(secondLatitude)
      * Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findNearbyWrecks(
  wrecks: WreckCompactItem[],
  selectedId: string,
  coordinates: [number, number],
  radiusKm = 25,
  limit = 5,
): NearbyWrecksResult {
  const matches: NearbyWreck[] = [];

  for (const wreck of wrecks) {
    if (wreck.id === selectedId) continue;

    const distanceKm = distanceBetweenCoordinatesKm(
      coordinates,
      wreck.coordinates,
    );
    if (distanceKm > radiusKm) continue;
    matches.push({ ...wreck, distanceKm });
  }

  matches.sort((left, right) =>
    left.distanceKm - right.distanceKm
    || left.name.localeCompare(right.name)
    || left.id.localeCompare(right.id));

  return {
    items: matches.slice(0, Math.max(0, limit)),
    totalWithinRadius: matches.length,
    radiusKm,
  };
}
