"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { MapGeoJSONFeature } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { AlertTriangle, RotateCw } from "lucide-react";
import { useAtlasStore } from "@/stores/atlas-store-provider";

type Collection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  {
    id: string;
    name: string;
    category: string;
    sunkYear: number | null;
    depthM: number | null;
  }
>;

const empty: Collection = { type: "FeatureCollection", features: [] };
const noSelectionFilter: maplibregl.FilterSpecification = ["==", ["get", "id"], ""];

export function AtlasMap() {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const sourceReady = useRef(false);
  const latestData = useRef<Collection>(empty);
  const [data, setData] = useState<Collection>(empty);
  const [error, setError] = useState(false);
  const era = useAtlasStore((state) => state.era);
  const selected = useAtlasStore((state) => state.selectedWreckId);
  const selectedRef = useRef(selected);
  const setEra = useAtlasStore((state) => state.setEra);
  const setSelected = useAtlasStore((state) => state.setSelected);

  const applyData = useCallback((next: Collection) => {
    latestData.current = next;
    const source = map.current?.getSource("wrecks") as maplibregl.GeoJSONSource | undefined;
    if (sourceReady.current && source) source.setData(next);
  }, []);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setError(false);
      try {
        const response = await fetch(`/api/wrecks?era=${era}`, { signal });
        if (!response.ok) throw new Error("data unavailable");
        const next = (await response.json()) as Collection;
        if (signal?.aborted) return;
        setData(next);
        applyData(next);
      } catch (caught) {
        if ((caught as Error).name === "AbortError") return;
        setData(empty);
        applyData(empty);
        setError(true);
      }
    },
    [applyData, era],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    selectedRef.current = selected;
    const instance = map.current;
    if (!instance?.getLayer("wreck-selected")) return;
    instance.setFilter(
      "wreck-selected",
      selected ? ["==", ["get", "id"], selected] : noSelectionFilter,
    );
  }, [selected]);

  useEffect(() => {
    if (!container.current || map.current) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const instance = new maplibregl.Map({
      container: container.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [4, 25],
      zoom: 1.5,
    });

    map.current = instance;
    instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");

    instance.on("style.load", () => {
      instance.addSource("wrecks", {
        type: "geojson",
        data: latestData.current,
        cluster: true,
        clusterMaxZoom: 8,
        clusterRadius: 52,
      });
      sourceReady.current = true;

      instance.addLayer({
        id: "clusters-glow",
        type: "circle",
        source: "wrecks",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#28ddf2",
          "circle-radius": ["step", ["get", "point_count"], 21, 8, 27, 25, 33],
          "circle-opacity": 0.22,
          "circle-blur": 0.18,
        },
      });
      instance.addLayer({
        id: "clusters",
        type: "circle",
        source: "wrecks",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#101114",
          "circle-stroke-color": "#ffe14d",
          "circle-stroke-width": 3,
          "circle-radius": ["step", ["get", "point_count"], 14, 8, 18, 25, 23],
        },
      });
      instance.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "wrecks",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-font": ["Noto Sans Bold"],
          "text-size": 11,
        },
        paint: { "text-color": "#ffffff" },
      });
      instance.addLayer({
        id: "wreck-locks",
        type: "circle",
        source: "wrecks",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 11,
          "circle-color": "rgba(255,255,255,0)",
          "circle-stroke-color": "#28ddf2",
          "circle-stroke-width": 1.5,
          "circle-opacity": 0.72,
        },
      });
      instance.addLayer({
        id: "wreck-points",
        type: "circle",
        source: "wrecks",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 5.5,
          "circle-color": "#28ddf2",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2.5,
          "circle-opacity": 1,
        },
      });
      instance.addLayer({
        id: "wreck-selected",
        type: "circle",
        source: "wrecks",
        filter: selectedRef.current
          ? ["==", ["get", "id"], selectedRef.current]
          : noSelectionFilter,
        paint: {
          "circle-radius": 16,
          "circle-color": "rgba(255,255,255,0)",
          "circle-stroke-color": "#ffe14d",
          "circle-stroke-width": 4,
        },
      });

      instance.on("click", "clusters", (event) => {
        const feature = instance.queryRenderedFeatures(event.point, { layers: ["clusters"] })[0];
        const clusterId = feature?.properties?.cluster_id;
        const source = instance.getSource("wrecks") as maplibregl.GeoJSONSource;
        if (typeof clusterId === "number") {
          source.getClusterExpansionZoom(clusterId).then((zoom) =>
            instance.easeTo({
              center: (feature.geometry as GeoJSON.Point).coordinates as [number, number],
              zoom,
              duration: reduceMotion ? 0 : 420,
            }),
          );
        }
      });

      ["wreck-locks", "wreck-points"].forEach((layer) => {
        instance.on("click", layer, (event) => {
          const feature = event.features?.[0] as MapGeoJSONFeature | undefined;
          const id = feature?.properties?.id;
          if (typeof id === "string") setSelected(id);
        });
      });

      ["clusters", "wreck-locks", "wreck-points"].forEach((layer) => {
        instance.on("mouseenter", layer, () => {
          instance.getCanvas().style.cursor = "crosshair";
        });
        instance.on("mouseleave", layer, () => {
          instance.getCanvas().style.cursor = "";
        });
      });
    });

    const fly = (event: Event) => {
      const coordinates = (event as CustomEvent<{ coordinates: [number, number] }>).detail.coordinates;
      instance.flyTo({
        center: coordinates,
        zoom: Math.max(instance.getZoom(), 5),
        duration: reduceMotion ? 0 : 850,
        essential: !reduceMotion,
      });
    };

    window.addEventListener("atlas:fly-to", fly);
    return () => {
      window.removeEventListener("atlas:fly-to", fly);
      sourceReady.current = false;
      instance.remove();
      map.current = null;
    };
  }, [setSelected]);

  return (
    <>
      <div
        ref={container}
        className="map"
        role="region"
        aria-label="Interactive map showing prototype shipwreck records"
      />
      {error && (
        <div className="map-error" role="status">
          <AlertTriangle size={16} />
          <span>Wreck records are unavailable. The chart is still usable.</span>
          <button onClick={() => void load()}>
            <RotateCw size={14} /> Retry
          </button>
        </div>
      )}
      {!error && data.features.length === 0 && (
        <div className="map-error" role="status">
          No wreck signals match this era.
          <button onClick={() => setEra("all")}>Clear filter</button>
        </div>
      )}
    </>
  );
}
