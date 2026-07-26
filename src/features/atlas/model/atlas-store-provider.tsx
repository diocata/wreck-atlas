"use client";
import { createContext, useContext, useRef, type ReactNode } from "react";
import { useStore } from "zustand";
import { createAtlasStore, type AtlasState } from "./atlas-store";

type AtlasStore = ReturnType<typeof createAtlasStore>;
type AtlasInitialState = Parameters<typeof createAtlasStore>[0];
const AtlasStoreContext = createContext<AtlasStore | null>(null);

export function AtlasStoreProvider({
  children,
  store,
  initialState,
}: {
  children: ReactNode;
  store?: AtlasStore;
  initialState?: AtlasInitialState;
}) {
  const storeRef = useRef<AtlasStore | null>(store ?? null);

  if (!storeRef.current) {
    storeRef.current = createAtlasStore(initialState);
  }

  return (
    <AtlasStoreContext.Provider value={storeRef.current}>
      {children}
    </AtlasStoreContext.Provider>
  );
}

export function useAtlasStore<T>(selector: (state: AtlasState) => T) {
  const store = useContext(AtlasStoreContext);

  if (!store) {
    throw new Error("useAtlasStore must be used within AtlasStoreProvider");
  }

  return useStore(store, selector);
}
