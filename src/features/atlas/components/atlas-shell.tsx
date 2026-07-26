"use client";

import { AtlasStoreProvider } from "@/features/atlas/model/atlas-store-provider";
import { AtlasToolbar } from "./atlas-toolbar";
import { AtlasMap } from "../map/atlas-map";
import { WreckDetailPanel } from "./wreck-detail-panel";
import { SourceStatus } from "./source-status";
import { AtlasCredits } from "./atlas-credits";

export function AtlasShell() {
  return (
    <AtlasStoreProvider>
      <main className="atlas">
        <AtlasMap />
        <AtlasToolbar />
        <WreckDetailPanel />
        <SourceStatus />
        <AtlasCredits />
      </main>
    </AtlasStoreProvider>
  );
}
