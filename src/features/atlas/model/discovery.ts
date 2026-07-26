import type { WreckCompactItem } from "@/domain/wreck";
import { getRecordKind } from "./filters";

const unidentifiedName = /^UNIDENTIFIED WRECK(?:\s|$)/i;

function isNamedWreck(wreck: WreckCompactItem): boolean {
  return (
    getRecordKind(wreck.category) === "wreck"
    && !unidentifiedName.test(wreck.name.trim())
  );
}

function pickCandidate(
  candidates: WreckCompactItem[],
  random: () => number,
): WreckCompactItem | null {
  if (candidates.length === 0) return null;

  const sample = random();
  const normalizedSample = Number.isFinite(sample)
    ? Math.min(Math.max(sample, 0), 0.999999999999)
    : 0;

  return candidates[Math.floor(normalizedSample * candidates.length)] ?? null;
}

export function chooseDiscoveryWreck(
  wrecks: WreckCompactItem[],
  currentId: string | null = null,
  random: () => number = Math.random,
): WreckCompactItem | null {
  const named = wrecks.filter(
    (wreck) => wreck.id !== currentId && isNamedWreck(wreck),
  );
  const richer = named.filter(
    (wreck) => wreck.sunkYear !== null || wreck.depthM !== null,
  );

  return pickCandidate(richer.length > 0 ? richer : named, random);
}
