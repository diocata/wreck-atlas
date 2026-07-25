import { createStore } from "zustand/vanilla";
export type Era = "all" | "before-1900" | "1900-1945" | "after-1945";
export type AtlasState = { selectedWreckId: string | null; era: Era; filterPanelOpen: boolean; setSelected: (id: string | null) => void; setEra: (era: Era) => void; setFilterPanelOpen: (open: boolean) => void };
export const createAtlasStore = () => createStore<AtlasState>()((set) => ({ selectedWreckId: null, era: "all", filterPanelOpen: false, setSelected: (selectedWreckId) => set({ selectedWreckId }), setEra: (era) => set({ era }), setFilterPanelOpen: (filterPanelOpen) => set({ filterPanelOpen }) }));
