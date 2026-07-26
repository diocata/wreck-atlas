import type { WreckCompactItem, WreckSearchResult } from "@/domain/wreck";

const minimumSearchLength = 2;
const defaultResultLimit = 8;

export function searchCompactWrecks(
  wrecks: WreckCompactItem[],
  query: string,
  limit = defaultResultLimit,
): WreckSearchResult[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery.length < minimumSearchLength || limit <= 0) return [];

  const matches: WreckSearchResult[] = [];
  for (const wreck of wrecks) {
    if (!wreck.name.toLowerCase().includes(normalizedQuery)) continue;

    matches.push({
      id: wreck.id,
      name: wreck.name,
      coordinates: wreck.coordinates,
      sunkYear: wreck.sunkYear,
      type: wreck.type,
    });

    if (matches.length === limit) break;
  }

  return matches;
}
