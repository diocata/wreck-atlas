import type { WreckCompactItem } from "@/domain/wreck";
import { isWreckInEra, type Era } from "./era";

export type RecordKind = "wreck" | "obstruction" | "unclassified";
export type RecordKindFilter = "all" | RecordKind;
export type DepthBand =
  | "all"
  | "under-10"
  | "10-30"
  | "30-100"
  | "100-plus"
  | "unknown";

export type AtlasFilters = {
  era: Era;
  recordKind: RecordKindFilter;
  depthBand: DepthBand;
};

export const recordKindOptions: ReadonlyArray<{
  value: RecordKindFilter;
  label: string;
}> = [
  { value: "all", label: "All record types" },
  { value: "wreck", label: "Wrecks" },
  { value: "obstruction", label: "Obstructions" },
  { value: "unclassified", label: "Not reported" },
];

export const depthBandOptions: ReadonlyArray<{
  value: DepthBand;
  label: string;
}> = [
  { value: "all", label: "Any recorded depth" },
  { value: "under-10", label: "Under 10 m" },
  { value: "10-30", label: "10–30 m" },
  { value: "30-100", label: "30–100 m" },
  { value: "100-plus", label: "100 m or deeper" },
  { value: "unknown", label: "Depth not reported" },
];

export const defaultAtlasFilters: AtlasFilters = {
  era: "all",
  recordKind: "all",
  depthBand: "all",
};

export function getRecordKind(category: string): RecordKind {
  const normalized = category.trim().toLowerCase();

  if (!normalized || normalized === "unclassified record") {
    return "unclassified";
  }

  return normalized.includes("wreck") ? "wreck" : "obstruction";
}

export function isWreckInDepthBand(
  wreck: Pick<WreckCompactItem, "depthM">,
  depthBand: DepthBand,
): boolean {
  if (depthBand === "all") return true;
  if (depthBand === "unknown") return wreck.depthM === null;
  if (wreck.depthM === null) return false;
  if (depthBand === "under-10") return wreck.depthM < 10;
  if (depthBand === "10-30") {
    return wreck.depthM >= 10 && wreck.depthM < 30;
  }
  if (depthBand === "30-100") {
    return wreck.depthM >= 30 && wreck.depthM < 100;
  }
  return wreck.depthM >= 100;
}

export function isWreckInFilters(
  wreck: WreckCompactItem,
  filters: AtlasFilters,
): boolean {
  return (
    isWreckInEra(wreck, filters.era)
    && (
      filters.recordKind === "all"
      || getRecordKind(wreck.category) === filters.recordKind
    )
    && isWreckInDepthBand(wreck, filters.depthBand)
  );
}

export function countActiveFilters(filters: AtlasFilters): number {
  return Number(filters.era !== "all")
    + Number(filters.recordKind !== "all")
    + Number(filters.depthBand !== "all");
}
