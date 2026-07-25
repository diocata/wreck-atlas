"use client";
import { AtlasStoreProvider } from "@/stores/atlas-store-provider";
import { AtlasToolbar } from "./atlas-toolbar";
import { AtlasMap } from "./atlas-map";
import { WreckDetailPanel } from "./wreck-detail-panel";
import { SourceStatus } from "./source-status";
export function AtlasShell() { return <AtlasStoreProvider><main className="atlas"><AtlasMap /><AtlasToolbar /><WreckDetailPanel /><SourceStatus /></main></AtlasStoreProvider>; }
