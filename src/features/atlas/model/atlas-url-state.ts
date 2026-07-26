import type { AtlasState } from "./atlas-store";
import {
  defaultAtlasFilters,
  type DepthBand,
  type RecordKindFilter,
} from "./filters";
import type { Era } from "./era";

export type AtlasUrlState = Pick<
  AtlasState,
  "selectedWreckId" | "era" | "recordKind" | "depthBand"
>;

export const defaultAtlasUrlState: AtlasUrlState = {
  selectedWreckId: null,
  ...defaultAtlasFilters,
};

const eras = new Set<Era>([
  "all",
  "before-1900",
  "1900-1945",
  "after-1945",
]);
const recordKinds = new Set<RecordKindFilter>([
  "all",
  "wreck",
  "obstruction",
  "unclassified",
]);
const depthBands = new Set<DepthBand>([
  "all",
  "under-10",
  "10-30",
  "30-100",
  "100-plus",
  "unknown",
]);

function isMember<T extends string>(
  values: ReadonlySet<T>,
  value: string | null,
): value is T {
  return value !== null && values.has(value as T);
}

export function parseAtlasUrlState(
  params: URLSearchParams,
): AtlasUrlState {
  const wreck = params.get("wreck")?.trim() ?? "";
  const era = params.get("era");
  const recordKind = params.get("kind");
  const depthBand = params.get("depth");

  return {
    selectedWreckId:
      wreck.length > 0 && wreck.length <= 120 ? wreck : null,
    era: isMember(eras, era) ? era : defaultAtlasUrlState.era,
    recordKind: isMember(recordKinds, recordKind)
      ? recordKind
      : defaultAtlasUrlState.recordKind,
    depthBand: isMember(depthBands, depthBand)
      ? depthBand
      : defaultAtlasUrlState.depthBand,
  };
}

export function serializeAtlasUrlState(state: AtlasUrlState): string {
  return JSON.stringify([
    state.selectedWreckId,
    state.era,
    state.recordKind,
    state.depthBand,
  ]);
}

export function buildAtlasUrl(
  currentUrl: string | URL,
  state: AtlasUrlState,
): URL {
  const url = new URL(currentUrl);

  if (state.selectedWreckId) {
    url.searchParams.set("wreck", state.selectedWreckId);
  } else {
    url.searchParams.delete("wreck");
  }

  if (state.era !== defaultAtlasUrlState.era) {
    url.searchParams.set("era", state.era);
  } else {
    url.searchParams.delete("era");
  }

  if (state.recordKind !== defaultAtlasUrlState.recordKind) {
    url.searchParams.set("kind", state.recordKind);
  } else {
    url.searchParams.delete("kind");
  }

  if (state.depthBand !== defaultAtlasUrlState.depthBand) {
    url.searchParams.set("depth", state.depthBand);
  } else {
    url.searchParams.delete("depth");
  }

  return url;
}
