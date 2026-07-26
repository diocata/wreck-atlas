import { createStore } from "zustand/vanilla";
import type { WreckCompactItem } from "@/domain/wreck";
import type { Era } from "./era";

export type { Era } from "./era";

export type AtlasState = {
  selectedWreckId: string | null;
  era: Era;
  filterPanelOpen: boolean;
  compactWrecks: WreckCompactItem[];
  isCacheLoading: boolean;
  cacheEtag: string | null;
  setSelected: (id: string | null) => void;
  setEra: (era: Era) => void;
  setFilterPanelOpen: (open: boolean) => void;
  setCompactWrecks: (wrecks: WreckCompactItem[], etag?: string | null) => void;
  setIsCacheLoading: (loading: boolean) => void;
  resetCacheState: () => void;
};

export const createAtlasStore = (initialState: Partial<Pick<
  AtlasState,
  "selectedWreckId" | "era" | "filterPanelOpen" | "compactWrecks" | "isCacheLoading" | "cacheEtag"
>> = {}) =>
  createStore<AtlasState>()((set) => ({
    selectedWreckId: null,
    era: "all",
    filterPanelOpen: false,
    compactWrecks: [],
    isCacheLoading: false,
    cacheEtag: null,
    setSelected: (selectedWreckId) => set({ selectedWreckId }),
    setEra: (era) => set({ era }),
    setFilterPanelOpen: (filterPanelOpen) => set({ filterPanelOpen }),
    setCompactWrecks: (compactWrecks, cacheEtag = null) =>
      set({ compactWrecks, cacheEtag, isCacheLoading: false }),
    setIsCacheLoading: (isCacheLoading) => set({ isCacheLoading }),
    resetCacheState: () =>
      set({ compactWrecks: [], cacheEtag: null, isCacheLoading: false }),
    ...initialState,
  }));
