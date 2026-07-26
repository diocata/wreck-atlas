import { describe, expect, it } from "vitest";
import { createAtlasStore } from "./atlas-store";

describe("atlas store", () => {
  it("updates interaction state and resets only compact cache state", () => {
    const store = createAtlasStore();
    const actions = store.getState();

    actions.setSelected("42");
    actions.setEra("after-1945");
    actions.setRecordKind("wreck");
    actions.setDepthBand("unknown");
    actions.setFilterPanelOpen(true);
    actions.openAtlasGuide("data");
    actions.setCompactWrecks([
      { id: "42", name: "Signal", category: "Wreck", type: "Ship", coordinates: [0, 0], sunkYear: 1950, depthM: null },
    ], "etag-1");
    actions.resetCacheState();

    expect(store.getState()).toMatchObject({
      selectedWreckId: "42",
      era: "after-1945",
      recordKind: "wreck",
      depthBand: "unknown",
      filterPanelOpen: true,
      atlasGuideOpen: true,
      atlasGuideSection: "data",
      compactWrecks: [],
      cacheEtag: null,
      isCacheLoading: false,
    });

    store.getState().resetFilters();
    expect(store.getState()).toMatchObject({
      era: "all",
      recordKind: "all",
      depthBand: "all",
    });

    store.getState().closeAtlasGuide();
    expect(store.getState().atlasGuideOpen).toBe(false);
  });
});
