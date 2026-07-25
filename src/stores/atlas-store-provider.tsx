"use client";
import { createContext, useContext, useRef, type ReactNode } from "react";
import { useStore } from "zustand";
import { createAtlasStore, type AtlasState } from "./atlas-store";
type AtlasStore = ReturnType<typeof createAtlasStore>;
const AtlasStoreContext = createContext<AtlasStore | null>(null);
export function AtlasStoreProvider({ children }: { children: ReactNode }) { const storeRef = useRef<AtlasStore | null>(null); if (!storeRef.current) storeRef.current = createAtlasStore(); return <AtlasStoreContext.Provider value={storeRef.current}>{children}</AtlasStoreContext.Provider>; }
export function useAtlasStore<T>(selector: (state: AtlasState) => T) { const store = useContext(AtlasStoreContext); if (!store) throw new Error("useAtlasStore must be used within AtlasStoreProvider"); return useStore(store, selector); }
