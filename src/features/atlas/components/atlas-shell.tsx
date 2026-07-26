"use client";

import { AtlasStoreProvider } from "@/features/atlas/model/atlas-store-provider";
import { AtlasUrlSync } from "@/features/atlas/model/atlas-url-sync";
import type { AtlasUrlState } from "@/features/atlas/model/atlas-url-state";
import { AtlasToolbar } from "./atlas-toolbar";
import { AtlasMap } from "../map/atlas-map";
import { WreckDetailPanel } from "./wreck-detail-panel";
import { SourceStatus } from "./source-status";
import { AtlasCredits } from "./atlas-credits";
import { AtlasGuidePanel } from "./atlas-guide-panel";

export function AtlasShell({
  initialUrlState,
}: {
  initialUrlState: AtlasUrlState;
}) {
  return (
    <AtlasStoreProvider initialState={initialUrlState}>
      <main className="atlas">
        <AtlasUrlSync initialState={initialUrlState} />
        <AtlasMap />
        <AtlasToolbar />
        <WreckDetailPanel />
        <AtlasGuidePanel />
        <SourceStatus />
        <AtlasCredits />
      </main>
    </AtlasStoreProvider>
  );
}
