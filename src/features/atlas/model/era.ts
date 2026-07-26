import type { WreckCompactItem } from "@/domain/wreck";

export type Era = "all" | "before-1900" | "1900-1945" | "after-1945";

export const eraOptions: ReadonlyArray<{
  value: Era;
  label: string;
  compact: string;
}> = [
  { value: "all", label: "All eras", compact: "All eras" },
  { value: "before-1900", label: "Before 1900", compact: "< 1900" },
  { value: "1900-1945", label: "1900–1945", compact: "1900–45" },
  { value: "after-1945", label: "After 1945", compact: "> 1945" },
];

export function isWreckInEra(
  wreck: Pick<WreckCompactItem, "sunkYear">,
  era: Era,
): boolean {
  if (era === "all") return true;
  if (wreck.sunkYear === null) return false;
  if (era === "before-1900") return wreck.sunkYear < 1900;
  if (era === "1900-1945") {
    return wreck.sunkYear >= 1900 && wreck.sunkYear <= 1945;
  }
  return wreck.sunkYear > 1945;
}
