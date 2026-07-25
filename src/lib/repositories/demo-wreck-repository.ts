import { demoWrecks } from "@/data/demo-wrecks";
import type { Wreck, WreckFeature } from "@/lib/domain/wreck";
export const featuresFor = (era?: string): WreckFeature[] => demoWrecks.filter((wreck) => {
  if (!era || era === "all") return true;
  if (!wreck.sunkYear) return false;
  return era === "before-1900" ? wreck.sunkYear < 1900 : era === "1900-1945" ? wreck.sunkYear >= 1900 && wreck.sunkYear <= 1945 : wreck.sunkYear > 1945;
}).map(({ id, name, category, coordinates, sunkYear, depthM }) => ({ id, name, category, coordinates, sunkYear, depthM }));
export const findWreck = (id: string): Wreck | undefined => demoWrecks.find((wreck) => wreck.id === id);
export const searchWrecks = (query: string) => demoWrecks.filter((wreck) => wreck.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6);
