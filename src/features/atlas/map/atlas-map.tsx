"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  loadCachedWrecks,
  revalidateWrecks,
} from "@/features/atlas/data/wreck-cache";
import { useAtlasStore } from "@/features/atlas/model/atlas-store-provider";
import { measureAtlasTask } from "@/features/atlas/model/performance";
import {
  emptyWreckFeatureCollection,
  toWreckFeatureCollection,
  type WreckFeatureCollection,
} from "./geojson";
import { registerWreckLayers, selectionFilter } from "./layers";
import { ResetViewControl } from "./reset-view-control";

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export function AtlasMap() {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const sourceReady = useRef(false);
  const latestData = useRef<WreckFeatureCollection>(
    emptyWreckFeatureCollection,
  );
  const selectedRef = useRef<string | null>(null);
  const [error, setError] = useState(false);
  const [isInitialLoadPending, setIsInitialLoadPending] = useState(true);

  const era = useAtlasStore((state) => state.era);
  const recordKind = useAtlasStore((state) => state.recordKind);
  const depthBand = useAtlasStore((state) => state.depthBand);
  const selected = useAtlasStore((state) => state.selectedWreckId);
  const compactWrecks = useAtlasStore((state) => state.compactWrecks);
  const isCacheLoading = useAtlasStore((state) => state.isCacheLoading);
  const resetFilters = useAtlasStore((state) => state.resetFilters);
  const setSelected = useAtlasStore((state) => state.setSelected);
  const setCompactWrecks = useAtlasStore((state) => state.setCompactWrecks);
  const setIsCacheLoading = useAtlasStore((state) => state.setIsCacheLoading);

  const data = useMemo(
    () => measureAtlasTask(
      "atlas:geojson-build",
      () => toWreckFeatureCollection(compactWrecks, {
        era,
        recordKind,
        depthBand,
      }),
    ),
    [compactWrecks, depthBand, era, recordKind],
  );

  const loadInitialWrecks = useCallback(async (signal?: AbortSignal) => {
    setError(false);
    setIsCacheLoading(true);

    try {
      const cached = await loadCachedWrecks();
      if (signal?.aborted) return;

      if (cached) {
        setCompactWrecks(cached.wrecks, cached.etag);
        void revalidateWrecks(cached.etag, signal)
          .then((result) => {
            if (!signal?.aborted && result.status === "updated") {
              setCompactWrecks(result.data.wrecks, result.data.etag);
            }
          })
          .catch((caught) => {
            if (!signal?.aborted && !isAbortError(caught)) {
              console.warn("Background wreck cache revalidation failed:", caught);
            }
          });
        return;
      }

      const result = await revalidateWrecks(null, signal);
      if (signal?.aborted) return;
      if (result.status !== "updated") {
        throw new Error("Initial wreck cache request was unexpectedly not modified");
      }
      setCompactWrecks(result.data.wrecks, result.data.etag);
    } catch (caught) {
      if (!isAbortError(caught) && !signal?.aborted) {
        setCompactWrecks([]);
        setError(true);
      }
    } finally {
      if (!signal?.aborted) {
        setIsCacheLoading(false);
        setIsInitialLoadPending(false);
      }
    }
  }, [setCompactWrecks, setIsCacheLoading]);

  useEffect(() => {
    const controller = new AbortController();
    void loadInitialWrecks(controller.signal);
    return () => controller.abort();
  }, [loadInitialWrecks]);

  useEffect(() => {
    latestData.current = data;
    const source = map.current?.getSource("wrecks") as
      | maplibregl.GeoJSONSource
      | undefined;
    if (sourceReady.current && source) source.setData(data);
  }, [data]);

  useEffect(() => {
    if (!container.current || map.current) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const instance = new maplibregl.Map({
      container: container.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [4, 25],
      zoom: 1.5,
      attributionControl: false,
    });
    map.current = instance;
    instance.addControl(
      new ResetViewControl(() => setSelected(null)),
      "bottom-right",
    );
    instance.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "bottom-right",
    );

    instance.on("style.load", () => {
      registerWreckLayers(instance, latestData.current, selectedRef.current);
      sourceReady.current = true;
    });

    instance.on("click", (event) => {
      const padding = 16;
      const features = instance.queryRenderedFeatures([
        [event.point.x - padding, event.point.y - padding],
        [event.point.x + padding, event.point.y + padding],
      ]);
      if (!features.length) return;

      const cluster = features.find(
        (feature) => feature.layer?.source === "wrecks"
          && (feature.properties?.cluster || feature.properties?.point_count),
      );
      if (cluster?.geometry.type === "Point") {
        const source = instance.getSource("wrecks") as
          | maplibregl.GeoJSONSource
          | undefined;
        const clusterId = cluster.properties?.cluster_id;
        const center = cluster.geometry.coordinates as [number, number];
        if (source && clusterId !== undefined) {
          void source.getClusterExpansionZoom(clusterId).then((zoom) => {
            instance.easeTo({
              center,
              zoom: zoom + 0.5,
              duration: reduceMotion ? 0 : 420,
            });
          }).catch(() => undefined);
        } else {
          instance.easeTo({
            center,
            zoom: instance.getZoom() + 2,
            duration: reduceMotion ? 0 : 420,
          });
        }
        return;
      }

      const wreck = features.find(
        (feature) => feature.layer?.source === "wrecks"
          && (feature.properties?.id !== undefined || feature.id !== undefined),
      );
      const id = wreck?.properties?.id ?? wreck?.id;
      if (!wreck || id === undefined || id === null || id === "") return;

      setSelected(String(id));
      if (wreck.geometry.type === "Point") {
        instance.easeTo({
          center: wreck.geometry.coordinates as [number, number],
          zoom: Math.max(instance.getZoom(), 8),
          duration: reduceMotion ? 0 : 420,
        });
      }
    });

    for (const layer of ["wreck-ships", "wreck-clusters"]) {
      instance.on("mouseenter", layer, () => {
        instance.getCanvas().style.cursor = "pointer";
      });
      instance.on("mouseleave", layer, () => {
        instance.getCanvas().style.cursor = "";
      });
    }

    instance.on("error", (event) => {
      if ((event as typeof event & { sourceId?: string }).sourceId === "wrecks") {
        setError(true);
      }
    });
    instance.on("data", (event) => {
      if (
        (event as typeof event & { sourceId?: string }).sourceId === "wrecks"
        && instance.isSourceLoaded("wrecks")
      ) {
        setError(false);
      }
    });

    const flyToSearchResult = (event: Event) => {
      const coordinates = (
        event as CustomEvent<{ coordinates: [number, number] }>
      ).detail.coordinates;
      instance.flyTo({
        center: coordinates,
        zoom: Math.max(instance.getZoom(), 12),
        duration: reduceMotion ? 0 : 850,
        essential: !reduceMotion,
      });
    };
    window.addEventListener("atlas:fly-to", flyToSearchResult);

    return () => {
      window.removeEventListener("atlas:fly-to", flyToSearchResult);
      sourceReady.current = false;
      instance.remove();
      map.current = null;
    };
  }, [setSelected]);

  useEffect(() => {
    selectedRef.current = selected;
    const instance = map.current;
    if (!instance) return;

    const filter = selectionFilter(selected);
    if (instance.getLayer("wreck-selected")) instance.setFilter("wreck-selected", filter);
    if (instance.getLayer("wreck-selected-icon")) {
      instance.setFilter("wreck-selected-icon", filter);
    }
  }, [selected]);

  const retry = () => {
    setIsInitialLoadPending(true);
    void loadInitialWrecks();
  };

  return (
    <>
      <div
        ref={container}
        className="map"
        role="region"
        aria-label="Interactive map showing documented shipwreck records"
      />
      {error && (
        <div className="map-error" role="status">
          <AlertTriangle size={16} />
          <span>Wreck records are unavailable. The chart is still usable.</span>
          <button onClick={retry}>
            <RotateCw size={14} /> Retry
          </button>
        </div>
      )}
      {!error
        && data.features.length === 0
        && !isCacheLoading
        && !isInitialLoadPending && (
        <div className="map-error" role="status">
          No wreck signals match these filters.
          <button onClick={resetFilters}>Clear filters</button>
        </div>
      )}
    </>
  );
}
