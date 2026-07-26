import { createStore } from "zustand/vanilla";
import type { WreckCompactItem } from "@/domain/wreck";
import {
  defaultAtlasFilters,
  type DepthBand,
  type RecordKindFilter,
} from "./filters";
import type { Era } from "./era";

export type { Era } from "./era";

export type AtlasState = {
  selectedWreckId: string | null;
  era: Era;
  recordKind: RecordKindFilter;
  depthBand: DepthBand;
  filterPanelOpen: boolean;
  aboutPanelOpen: boolean;
  compactWrecks: WreckCompactItem[];
  isCacheLoading: boolean;
  cacheEtag: string | null;
  setSelected: (id: string | null) => void;
  setEra: (era: Era) => void;
  setRecordKind: (recordKind: RecordKindFilter) => void;
  setDepthBand: (depthBand: DepthBand) => void;
  resetFilters: () => void;
  setFilterPanelOpen: (open: boolean) => void;
  setAboutPanelOpen: (open: boolean) => void;
  setCompactWrecks: (wrecks: WreckCompactItem[], etag?: string | null) => void;
  setIsCacheLoading: (loading: boolean) => void;
  resetCacheState: () => void;
};

export const createAtlasStore = (initialState: Partial<Pick<
  AtlasState,
  | "selectedWreckId"
  | "era"
  | "recordKind"
  | "depthBand"
  | "filterPanelOpen"
  | "aboutPanelOpen"
  | "compactWrecks"
  | "isCacheLoading"
  | "cacheEtag"
>> = {}) =>
  createStore<AtlasState>()((set) => ({
    selectedWreckId: null,
    ...defaultAtlasFilters,
    filterPanelOpen: false,
    aboutPanelOpen: false,
    compactWrecks: [],
    isCacheLoading: false,
    cacheEtag: null,
    setSelected: (selectedWreckId) => set({ selectedWreckId }),
    setEra: (era) => set({ era }),
    setRecordKind: (recordKind) => set({ recordKind }),
    setDepthBand: (depthBand) => set({ depthBand }),
    resetFilters: () => set(defaultAtlasFilters),
    setFilterPanelOpen: (filterPanelOpen) => set({ filterPanelOpen }),
    setAboutPanelOpen: (aboutPanelOpen) => set({ aboutPanelOpen }),
    setCompactWrecks: (compactWrecks, cacheEtag = null) =>
      set({ compactWrecks, cacheEtag, isCacheLoading: false }),
    setIsCacheLoading: (isCacheLoading) => set({ isCacheLoading }),
    resetCacheState: () =>
      set({ compactWrecks: [], cacheEtag: null, isCacheLoading: false }),
    ...initialState,
  }));
