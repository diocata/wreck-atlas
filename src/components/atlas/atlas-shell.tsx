"use client";

import type { WreckDataSource } from "@/lib/domain/wreck";
import { AtlasStoreProvider } from "@/stores/atlas-store-provider";
import { AtlasToolbar } from "./atlas-toolbar";
import { AtlasMap } from "./atlas-map";
import { WreckDetailPanel } from "./wreck-detail-panel";
import { SourceStatus } from "./source-status";

export function AtlasShell({
  dataSource,
}: {
  dataSource: WreckDataSource;
}) {
  return (
    <AtlasStoreProvider>
      <main className="atlas">
        <AtlasMap dataSource={dataSource} />
        <AtlasToolbar />
        <WreckDetailPanel />
        <SourceStatus dataSource={dataSource} />
      </main>
    </AtlasStoreProvider>
  );
}
