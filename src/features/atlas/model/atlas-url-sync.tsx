"use client";

import { useEffect, useRef } from "react";
import { useAtlasStore } from "./atlas-store-provider";
import {
  buildAtlasUrl,
  parseAtlasUrlState,
  serializeAtlasUrlState,
  type AtlasUrlState,
} from "./atlas-url-state";

export function AtlasUrlSync({
  initialState,
}: {
  initialState: AtlasUrlState;
}) {
  const selectedWreckId = useAtlasStore((state) => state.selectedWreckId);
  const era = useAtlasStore((state) => state.era);
  const recordKind = useAtlasStore((state) => state.recordKind);
  const depthBand = useAtlasStore((state) => state.depthBand);
  const setSelected = useAtlasStore((state) => state.setSelected);
  const setEra = useAtlasStore((state) => state.setEra);
  const setRecordKind = useAtlasStore((state) => state.setRecordKind);
  const setDepthBand = useAtlasStore((state) => state.setDepthBand);
  const previous = useRef(serializeAtlasUrlState(initialState));
  const restoringHistory = useRef(false);

  useEffect(() => {
    const restore = () => {
      const next = parseAtlasUrlState(
        new URLSearchParams(window.location.search),
      );

      restoringHistory.current = true;
      previous.current = serializeAtlasUrlState(next);
      setSelected(next.selectedWreckId);
      setEra(next.era);
      setRecordKind(next.recordKind);
      setDepthBand(next.depthBand);
      queueMicrotask(() => {
        restoringHistory.current = false;
      });
    };

    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [setDepthBand, setEra, setRecordKind, setSelected]);

  useEffect(() => {
    const state: AtlasUrlState = {
      selectedWreckId,
      era,
      recordKind,
      depthBand,
    };
    const serialized = serializeAtlasUrlState(state);

    if (restoringHistory.current || serialized === previous.current) return;

    const url = buildAtlasUrl(window.location.href, state);
    window.history.pushState(null, "", `${url.pathname}${url.search}${url.hash}`);
    previous.current = serialized;
  }, [depthBand, era, recordKind, selectedWreckId]);

  return null;
}
