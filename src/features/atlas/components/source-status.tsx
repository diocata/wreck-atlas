"use client";

import { RefreshCw, Database } from "lucide-react";
import { clearWreckCache } from "@/features/atlas/data/wreck-cache";
import { useAtlasStore } from "@/features/atlas/model/atlas-store-provider";

export function SourceStatus() {
  const compactWrecks = useAtlasStore((state) => state.compactWrecks);
  const isCacheLoading = useAtlasStore((state) => state.isCacheLoading);
  const resetCacheState = useAtlasStore((state) => state.resetCacheState);
  const openAtlasGuide = useAtlasStore((state) => state.openAtlasGuide);

  const handleClearCache = async () => {
    await clearWreckCache();
    resetCacheState();
    window.location.reload();
  };

  return (
    <footer className="source-status">
      <button
        type="button"
        className="source-data-guide"
        onClick={(event) => {
          event.currentTarget.focus({ preventScroll: true });
          openAtlasGuide("data");
        }}
      >
        UKHO · DATA GUIDE
      </button>
      <span className="source-divider" />
      <a href="https://openfreemap.org/" target="_blank" rel="noreferrer">
        OSM · OPENFREEMAP
      </a>
      <span className="source-divider" />
      {isCacheLoading ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--cyan, #00f0ff)" }}>
          <RefreshCw size={10} style={{ animation: "spin 1s linear infinite" }} />
          <span>SYNCING CACHE...</span>
        </span>
      ) : compactWrecks.length > 0 ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }} title="Offline IndexedDB cache active">
          <Database size={10} />
          <span>{compactWrecks.length.toLocaleString()} CACHED</span>
          <button
            onClick={handleClearCache}
            style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: "0 2px", opacity: 0.7 }}
            title="Clear cache and resync"
            aria-label="Clear cache and resync"
          >
            <RefreshCw size={9} />
          </button>
        </span>
      ) : null}
      {compactWrecks.length > 0 && <span className="source-divider" />}
      <strong>NOT FOR NAVIGATION</strong>
    </footer>
  );
}
